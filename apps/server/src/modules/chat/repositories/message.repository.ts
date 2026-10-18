import { Injectable } from '@nestjs/common';
import type { DbTx, MessageKind } from '@opchub/db';
import { Prisma } from '@opchub/db';
import { containsPattern } from '@/common/prisma/like';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { MessageRow } from '../domain/message.mapper';

type Db = DbTx | PrismaService['db'];

/**
 * Dựng DTO cho một tập id tin (đã chọn bằng keyset ở bước trước — deferred join):
 * người gửi, chủ nhóm?, trả lời, ghim, reaction gom theo emoji, của tôi, tôi đã báo cáo.
 * `viewer` NULL (admin) → my_reactions/reported_by_me rỗng.
 */
const dtoSql = (ids: string[], viewer: string | null) => Prisma.sql`
  SELECT m.id, m.room_id, m.sender_id, COALESCE(u.full_name, ps.name) AS sender_name,
    COALESCE(u.avatar_url, ps.avatar_url) AS sender_avatar, m.persona_id,
    (gm.group_role = 'owner') IS TRUE AS sender_is_owner,
    m.kind, m.body, m.attachment, m.client_msg_id, m.is_simulated, m.created_at,
    rp.full_name AS reply_name, r.body AS reply_body, r.kind AS reply_kind, r.attachment AS reply_attachment,
    (p.message_id IS NOT NULL) AS pinned,
    (SELECT json_agg(json_build_object('emoji', x.emoji, 'names', x.names) ORDER BY x.first)
       FROM (SELECT mr.emoji, array_agg(ru.full_name ORDER BY mr.created_at) AS names, min(mr.created_at) AS first
             FROM message_reactions mr JOIN users ru ON ru.id = mr.user_id
             WHERE mr.message_id = m.id GROUP BY mr.emoji) x) AS reactions,
    (SELECT array_agg(mr.emoji) FROM message_reactions mr
       WHERE mr.message_id = m.id AND mr.user_id = ${viewer}) AS my_reactions,
    EXISTS (SELECT 1 FROM message_flags f WHERE f.message_id = m.id AND f.user_id = ${viewer}) AS reported_by_me
  FROM messages m
  JOIN rooms rm ON rm.id = m.room_id
  LEFT JOIN users u ON u.id = m.sender_id
  LEFT JOIN personas ps ON ps.id = m.persona_id
  LEFT JOIN group_members gm ON gm.group_id = rm.group_id AND gm.user_id = m.sender_id
  LEFT JOIN messages r ON r.id = m.reply_to_id
  LEFT JOIN users rp ON rp.id = r.sender_id
  LEFT JOIN pinned_messages p ON p.message_id = m.id
  WHERE m.id = ANY(${ids}::text[])`;

export interface InsertMessage {
  roomId: string;
  senderId: string;
  kind: MessageKind;
  body: string;
  attachment: Prisma.InputJsonValue | null;
  replyToId: string | null;
  clientMsgId: string;
}

/** Tin nhắn: keyset lịch sử, insert idempotent (S-12), DTO theo người xem */
@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async dtos(ids: readonly string[], viewer: string | null, db: Db = this.prisma.db) {
    if (!ids.length) return new Map<string, MessageRow>();
    const rows = await db.$queryRaw<MessageRow[]>(dtoSql([...ids], viewer));
    return new Map(rows.map((r) => [r.id, r]));
  }

  /**
   * Trang id theo keyset trên (room_id, created_at DESC, id DESC) — idx messages_room_id_created_at_id_idx.
   * `before` → cũ hơn (mới → cũ); `after` → mới hơn (cũ → mới, S-06). Tin ẩn/xoá không hiện.
   */
  async pageIds(
    roomId: string,
    opt: { before?: string | undefined; after?: string | undefined; q?: string | undefined },
    size: number,
  ): Promise<string[]> {
    const pattern = opt.q ? containsPattern(opt.q) : null;
    const search = pattern
      ? Prisma.sql`AND (m.body ILIKE ${pattern} OR m.attachment->>'name' ILIKE ${pattern})`
      : Prisma.empty;
    const live = Prisma.sql`m.room_id = ${roomId} AND m.hidden_at IS NULL AND m.deleted_at IS NULL`;
    if (opt.after) {
      const rows = await this.prisma.db.$queryRaw<{ id: string }[]>`
        SELECT m.id FROM messages m
        WHERE ${live} ${search}
          AND (m.created_at, m.id) > (SELECT created_at, id FROM messages WHERE id = ${opt.after})
        ORDER BY m.created_at ASC, m.id ASC LIMIT ${size}`;
      return rows.map((r) => r.id);
    }
    const cursor = opt.before
      ? Prisma.sql`AND (m.created_at, m.id) < (SELECT created_at, id FROM messages WHERE id = ${opt.before})`
      : Prisma.empty;
    const rows = await this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT m.id FROM messages m
      WHERE ${live} ${cursor} ${search}
      ORDER BY m.created_at DESC, m.id DESC LIMIT ${size}`;
    return rows.map((r) => r.id);
  }

  /** S-12: unique (room_id, sender_id, client_msg_id) — trùng trả id cũ, `created=false` */
  async insert(tx: DbTx, m: InsertMessage): Promise<{ id: string; created: boolean }> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO messages (id, room_id, sender_id, kind, body, attachment, reply_to_id, client_msg_id, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${m.roomId}, ${m.senderId}, ${m.kind}::message_kind, ${m.body},
              ${m.attachment === null ? null : JSON.stringify(m.attachment)}::jsonb, ${m.replyToId}, ${m.clientMsgId}, now(), now())
      ON CONFLICT (room_id, sender_id, client_msg_id) DO NOTHING
      RETURNING id`;
    if (rows[0]) return { id: rows[0].id, created: true };
    const old = await tx.message.findFirstOrThrow({
      where: { roomId: m.roomId, senderId: m.senderId, clientMsgId: m.clientMsgId },
      select: { id: true },
    });
    return { id: old.id, created: false };
  }

  /**
   * Tin persona (D-48, S-11): sender NULL, `persona_id`, `is_simulated`; idempotent theo UQ partial
   * `messages_persona_client_msg` (room_id, persona_id, client_msg_id). Nhiều dòng một câu.
   */
  async insertPersona(
    tx: DbTx,
    rows: readonly { roomId: string; personaId: string; body: string; clientMsgId: string }[],
  ): Promise<{ id: string; roomId: string }[]> {
    if (!rows.length) return [];
    return tx.$queryRaw<{ id: string; roomId: string }[]>`
      INSERT INTO messages (id, room_id, persona_id, is_simulated, kind, body, client_msg_id,
                            created_at, updated_at)
      SELECT gen_random_uuid()::text, x.room_id, x.persona_id, true, 'text', x.body, x.cid,
             now() + (x.ord * interval '1 millisecond'), now()
      FROM unnest(${rows.map((r) => r.roomId)}::text[], ${rows.map((r) => r.personaId)}::text[],
                  ${rows.map((r) => r.body)}::text[], ${rows.map((r) => r.clientMsgId)}::text[])
           WITH ORDINALITY AS x(room_id, persona_id, body, cid, ord)
      ON CONFLICT (room_id, persona_id, client_msg_id)
        WHERE persona_id IS NOT NULL AND client_msg_id IS NOT NULL DO NOTHING
      RETURNING id, room_id AS "roomId"`;
  }

  /** Tin + phòng + nhóm (kiểm quyền react/pin/báo cáo) */
  findWithRoom(id: string) {
    return this.prisma.db.message.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        replyTo: { select: { senderId: true } },
        room: { select: { groupId: true, name: true } },
      },
    });
  }

  /** Tin trả lời phải cùng phòng */
  async replyTarget(roomId: string, id: string): Promise<{ senderId: string | null } | null> {
    return this.prisma.db.message.findFirst({
      where: { id, roomId, deletedAt: null },
      select: { senderId: true },
    });
  }

  /** Bật/tắt reaction; trả true nếu vừa thêm */
  async toggleReaction(tx: DbTx, messageId: string, userId: string, emoji: string) {
    const del = await tx.messageReaction.deleteMany({ where: { messageId, userId, emoji } });
    if (del.count) return false;
    await tx.messageReaction.create({ data: { messageId, userId, emoji } });
    return true;
  }

  async setPin(tx: DbTx, roomId: string, messageId: string, by: string, pinned: boolean) {
    if (pinned) {
      await tx.pinnedMessage.upsert({
        where: { roomId_messageId: { roomId, messageId } },
        create: { roomId, messageId, pinnedBy: by },
        update: {},
      });
    } else {
      await tx.pinnedMessage.deleteMany({ where: { roomId, messageId } });
    }
  }
}
