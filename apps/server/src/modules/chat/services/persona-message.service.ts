import { Injectable } from '@nestjs/common';
import { AppError } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';
import { RedisService } from '@/common/redis/redis.service';
import { toChatMessage } from '../domain/message.mapper';
import { MessageRepository } from '../repositories/message.repository';
import { ChatFeedService } from './chat-feed.service';
import { MessageService } from './message.service';
import { UnreadService } from './unread.service';

/** NA-08: số tin mô phỏng giữ lại mỗi phòng */
export const SIMULATED_KEEP = 120;
/** S-11: tối đa N tin persona / phút / nhóm */
const GROUP_RATE = { max: 30, windowSec: 60 };

export interface PersonaLine {
  personaId: string;
  body: string;
}

/**
 * Đường đăng tin của persona (bot, D-48/S-11) — cùng bảng, cùng sự kiện `message.new` với tin
 * người thật; DTO phát ra là DTO Portal (không có `isSimulated`). Gọi trong job duyệt hội thoại.
 */
@Injectable()
export class PersonaMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly messages: MessageRepository,
    private readonly unread: UnreadService,
    private readonly roomEvents: RoomEventsPublisher,
    private readonly feed: ChatFeedService,
    private readonly sent: MessageService,
  ) {}

  /**
   * Đăng `lines` vào phòng mặc định (`general`) của từng nhóm. `key` tạo `client_msg_id`
   * (`{key}-{i}`) → chạy lại không đăng trùng. Trả số tin mới.
   */
  async post(
    key: string,
    groupIds: readonly string[],
    lines: readonly PersonaLine[],
  ): Promise<number> {
    const rooms = await this.prisma.db.room.findMany({
      where: { groupId: { in: [...groupIds] }, isDefault: true },
      select: { id: true, groupId: true, group: { select: { name: true } } },
    });
    const groupOf = new Map(rooms.map((r) => [r.id, r]));
    for (const r of rooms) await this.rateLimit(r.groupId, lines.length);
    const rows = rooms.flatMap((r) =>
      lines.map((l, i) => ({
        roomId: r.id,
        personaId: l.personaId,
        body: l.body,
        clientMsgId: `${key}-${i}`,
      })),
    );
    const created = await this.prisma.db.$transaction(async (tx) => {
      const ins = await this.messages.insertPersona(tx, rows);
      const perPersona = new Map<string, number>();
      for (const l of lines) perPersona.set(l.personaId, (perPersona.get(l.personaId) ?? 0) + 1);
      if (ins.length) {
        await tx.$executeRaw`
          UPDATE personas p SET post_count = p.post_count + x.n * ${rooms.length}
          FROM unnest(${[...perPersona.keys()]}::text[], ${[...perPersona.values()]}::int[]) AS x(id, n)
          WHERE p.id = x.id`;
      }
      return ins;
    });
    if (!created.length) return 0;
    const dtos = await this.messages.dtos(
      created.map((c) => c.id),
      null,
    );
    // Phát theo thứ tự dòng thoại trong từng phòng
    const ordered = [...dtos.values()].sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );
    for (const row of ordered) {
      const dto = toChatMessage(row);
      // D-117 B4: trúng từ khoá → chỉ chạy hook (job ẩn + tạo ca), không phát nguyên văn
      if (this.sent.screenHit(dto.body)) {
        await this.sent.runSentHooks({
          id: row.id,
          roomId: row.room_id,
          senderId: null,
          body: dto.body,
        });
        continue;
      }
      await this.unread.onMessage(row.room_id, null);
      await this.roomEvents.publish(row.room_id, 'message.new', {
        ...dto,
        myReactions: [],
        reportedByMe: false,
      });
      await this.sent.runSentHooks({
        id: row.id,
        roomId: row.room_id,
        senderId: null,
        body: dto.body,
      });
      const room = groupOf.get(row.room_id);
      if (room) {
        await this.feed.sent({
          id: row.id,
          roomId: row.room_id,
          groupId: room.groupId,
          groupName: room.group.name,
          senderId: null,
          sender: dto.sender,
          at: row.created_at,
        });
      }
    }
    return created.length;
  }

  private async rateLimit(groupId: string, n: number): Promise<void> {
    const key = `chat:persona-rate:${groupId}`;
    const res = await this.redis.client
      .multi()
      .incrby(key, n)
      .expire(key, GROUP_RATE.windowSec, 'NX')
      .exec();
    if (Number(res?.[0]?.[1] ?? 0) > GROUP_RATE.max) {
      await this.redis.client.decrby(key, n);
      throw new AppError(
        'RATE_LIMITED',
        'Nhóm đang nhận quá nhiều tin tự động, vui lòng thử lại sau ít phút',
        undefined,
        GROUP_RATE.windowSec,
      );
    }
  }

  /**
   * NA-08 + NA-13 (job 02:00): mỗi phòng giữ 120 tin mô phỏng mới nhất, phần còn lại xoá mềm —
   * 1 câu window theo phòng (idx partial `messages_simulated_room_idx`). Tin người thật không đụng.
   */
  async pruneSimulated(keep = SIMULATED_KEEP): Promise<number> {
    return this.prisma.db.$executeRaw`
      UPDATE messages m SET deleted_at = now()
      FROM (
        SELECT id, row_number() OVER (PARTITION BY room_id ORDER BY created_at DESC, id DESC) AS rn
        FROM messages WHERE is_simulated AND deleted_at IS NULL
      ) x
      WHERE m.id = x.id AND x.rn > ${keep}`;
  }
}
