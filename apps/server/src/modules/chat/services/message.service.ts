import { Injectable } from '@nestjs/common';
import type {
  ChatMessage,
  ChatMessagePage,
  Message,
  SendMessageRequest,
} from '@opchub/shared/api-domains';
import { sendMessageSchema } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import type { AccessClaims } from '@/common/auth';
import { AppError, notFound } from '@/common/errors';
import { parseClean } from '@/common/html/sanitize-input';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';
import { RedisService } from '@/common/redis/redis.service';
import { ImageRefService } from '../../uploads';
import { type MessageRow, toAdminMessage, toChatMessage } from '../domain/message.mapper';
import { mentionTargets } from '../domain/room-key';
import { MessageRepository } from '../repositories/message.repository';
import { ChatAccessService } from './chat-access.service';
import { ChatFeedService } from './chat-feed.service';
import { UnreadService } from './unread.service';

/** socket-chat.md: 10 tin / 10 giây / người */
const RATE = { max: 10, windowSec: 10 };

export type MessageHook = (m: {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
}) => Promise<void>;

/** Gửi tin / lịch sử (S-02, S-06, S-12) — dùng chung REST và socket */
@Injectable()
export class MessageService {
  private readonly hooks: MessageHook[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly messages: MessageRepository,
    private readonly access: ChatAccessService,
    private readonly unread: UnreadService,
    private readonly outbox: OutboxService,
    private readonly roomEvents: RoomEventsPublisher,
    private readonly audit: AuditService,
    private readonly files: ImageRefService,
    private readonly feed: ChatFeedService,
  ) {}

  /** Domain khác (kiểm duyệt từ khoá, B24) đăng ký xử lý sau commit — không chặn đường gửi */
  onSent(hook: MessageHook): void {
    this.hooks.push(hook);
  }

  async one(id: string, viewer: string | null): Promise<MessageRow> {
    const row = (await this.messages.dtos([id], viewer)).get(id);
    if (!row) throw notFound('Không tìm thấy tin nhắn');
    return row;
  }

  async history(
    user: AccessClaims,
    roomId: string,
    q: {
      before?: string | undefined;
      after?: string | undefined;
      q?: string | undefined;
      size: number;
    },
  ): Promise<
    | { admin: false; page: ChatMessagePage }
    | { admin: true; page: { items: Message[]; nextCursor: string | null } }
  > {
    const room = await this.access.room(roomId);
    const { admin } = await this.access.assertRead(user, room.groupId);
    const size = q.after ? Math.min(q.size, 100) : q.size;
    const ids = await this.messages.pageIds(roomId, q, size + 1);
    const more = ids.length > size;
    const pageIds = ids.slice(0, size);
    const rows = await this.messages.dtos(pageIds, admin ? null : user.sub);
    const ordered = pageIds.flatMap((id) => {
      const r = rows.get(id);
      return r ? [r] : [];
    });
    const nextCursor = more ? (pageIds.at(-1) ?? null) : null;
    if (admin) return { admin, page: { items: ordered.map(toAdminMessage), nextCursor } };
    return { admin, page: { items: ordered.map(toChatMessage), nextCursor } };
  }

  private async rateLimit(userId: string): Promise<void> {
    const key = `chat:rate:${userId}`;
    const res = await this.redis.client.multi().incr(key).expire(key, RATE.windowSec, 'NX').exec();
    const n = Number(res?.[0]?.[1] ?? 0);
    if (n > RATE.max) {
      throw new AppError(
        'RATE_LIMITED',
        'Bạn gửi quá nhanh, vui lòng chờ giây lát',
        undefined,
        RATE.windowSec,
      );
    }
  }

  /**
   * message.send: kiểm quyền → rate limit → INSERT idempotent → (sau commit) phát `message.new`,
   * seq chưa đọc, hook kiểm duyệt. Trùng clientMsgId → trả tin cũ, không phát lại.
   */
  async send(user: AccessClaims, roomId: string, input: SendMessageRequest): Promise<ChatMessage> {
    // Socket không qua ZodBody: tin chat là text thuần (security.md, NA-27) — bỏ thẻ trước insert
    const req = parseClean(sendMessageSchema, input);
    const room = await this.access.room(roomId);
    await this.access.assertMember(user, room.groupId);
    await this.rateLimit(user.sub);
    const reply = req.replyTo ? await this.messages.replyTarget(roomId, req.replyTo) : null;
    if (req.replyTo && !reply) throw notFound('Không tìm thấy tin được trả lời');
    // BUG-010: tệp/ảnh là object của chính người gửi đã PUT — head() NGOÀI transaction (luật 9)
    const attachment =
      req.kind === 'text' || !req.attachment
        ? null
        : await this.files.resolveFile({
            userId: user.sub,
            kind: req.kind === 'image' ? 'chat-image' : 'chat-file',
            attachment: req.attachment,
            path: 'attachment',
          });

    const res = await this.prisma.db.$transaction(async (tx) => {
      const r = await this.messages.insert(tx, {
        roomId,
        senderId: user.sub,
        kind: req.kind,
        body: req.kind === 'text' ? req.body : '',
        attachment,
        replyToId: req.replyTo ?? null,
        clientMsgId: req.clientMsgId,
      });
      if (!r.created) return r;
      const mentioned = mentionTargets(req.mentions, user.sub);
      if (mentioned.length) {
        await this.outbox.add(tx, 'chat.mentioned', {
          messageId: r.id,
          roomId,
          senderId: user.sub,
          userIds: mentioned,
          kind: 'mention',
        });
      }
      const replied = reply?.senderId;
      if (replied && replied !== user.sub && !mentioned.includes(replied)) {
        await this.outbox.add(tx, 'chat.mentioned', {
          messageId: r.id,
          roomId,
          senderId: user.sub,
          userIds: [replied],
          kind: 'reply',
        });
      }
      return r;
    });
    const dto = toChatMessage(await this.one(res.id, user.sub));
    if (res.created) {
      await this.unread.onMessage(roomId, user.sub);
      await this.roomEvents.publish(roomId, 'message.new', neutral(dto));
      await this.feed.sent({
        id: res.id,
        roomId,
        groupId: room.groupId,
        groupName: room.groupName,
        senderId: user.sub,
        sender: dto.sender,
        at: new Date(dto.createdAt),
      });
      const hook = { id: res.id, roomId, senderId: user.sub, body: dto.body };
      await Promise.all(this.hooks.map((h) => h(hook).catch(() => undefined)));
    }
    return dto;
  }

  /** Bật/tắt cảm xúc — thành viên của nhóm */
  async react(user: AccessClaims, messageId: string, emoji: string): Promise<ChatMessage> {
    const m = await this.messages.findWithRoom(messageId);
    if (!m) throw notFound('Không tìm thấy tin nhắn');
    await this.access.assertMember(user, m.room.groupId);
    await this.prisma.db.$transaction((tx) =>
      this.messages.toggleReaction(tx, messageId, user.sub, emoji),
    );
    return this.updated(messageId, m.roomId, user.sub);
  }

  /**
   * Ghim: chủ nhóm của nhóm đó hoặc `c.mod` (D-43). Quản trị không phải chủ nhóm → audit
   * `chat.pin|chat.unpin` cùng transaction (BUG-039, luật 10); chủ nhóm ghim không ghi.
   */
  async pin(
    user: AccessClaims,
    messageId: string,
    pinned: boolean,
    ip: string | null = null,
  ): Promise<ChatMessage> {
    const m = await this.messages.findWithRoom(messageId);
    if (!m) throw notFound('Không tìm thấy tin nhắn');
    const by = await this.access.pinAuthority(user, m.room.groupId);
    if (!by) throw new AppError('FORBIDDEN', 'Chỉ chủ nhóm được ghim tin nhắn');
    await this.prisma.db.$transaction(async (tx) => {
      await this.messages.setPin(tx, m.roomId, messageId, user.sub, pinned);
      if (by !== 'admin') return;
      await this.audit.log(tx, {
        actorId: user.sub,
        action: pinned ? 'chat.pin' : 'chat.unpin',
        entity: 'message',
        entityId: messageId,
        tag: 'moderation',
        summary: `${pinned ? 'ghim' : 'bỏ ghim'} tin nhắn trong phòng ${m.room.name}`,
        ip,
      });
    });
    return this.updated(messageId, m.roomId, user.sub);
  }

  private async updated(messageId: string, roomId: string, viewer: string): Promise<ChatMessage> {
    const dto = toChatMessage(await this.one(messageId, viewer));
    await this.roomEvents.publish(roomId, 'message.updated', neutral(dto));
    return dto;
  }
}

/** DTO phát cho cả phòng: bỏ phần riêng của người gọi */
const neutral = (m: ChatMessage): ChatMessage => ({ ...m, myReactions: [], reportedByMe: false });
