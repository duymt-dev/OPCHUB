import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

/** HASH roomId → số thứ tự tin hiển thị của phòng (tăng mỗi tin) */
const SEQ = 'chat:seq';
/** HASH roomId → seq của phòng tại lần đọc cuối của user */
const readKey = (userId: string) => `chat:read:${userId}`;
const READ_TTL_SEC = 60 * 24 * 3600;

/**
 * Chưa đọc (S-04, S-05) bằng seq phòng: gửi tin = 1 HINCRBY (không đụng người nhận, S-02);
 * chưa đọc = seq phòng − seq lúc đọc. Người gửi được tính là đã đọc tới tin của mình.
 * Miss (Redis trống) → dựng lại từ `room_read_cursors` bằng 1 query cho mọi phòng.
 */
@Injectable()
export class UnreadService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async counts(userId: string, roomIds: readonly string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!roomIds.length) return out;
    const ids = [...roomIds];
    const [seqs, reads] = await Promise.all([
      this.redis.client.hmget(SEQ, ...ids),
      this.redis.client.hmget(readKey(userId), ...ids),
    ]);
    const missing = ids.filter((_, i) => seqs[i] === null || reads[i] === null);
    const rebuilt = missing.length
      ? await this.rebuild(userId, missing)
      : new Map<string, number>();
    ids.forEach((id, i) => {
      const fixed = rebuilt.get(id);
      out.set(id, fixed ?? Math.max(0, Number(seqs[i]) - Number(reads[i])));
    });
    return out;
  }

  /**
   * 1 query: tổng tin hiển thị + số tin người khác gửi sau cursor của user.
   * Ghi seq phòng (nếu thiếu, HSETNX) rồi đặt seq-đọc = seq − chưa đọc.
   */
  private async rebuild(userId: string, roomIds: string[]): Promise<Map<string, number>> {
    const rows = await this.prisma.db.$queryRaw<
      { room_id: string; total: number; unread: number }[]
    >`
      SELECT r.id AS room_id,
        (SELECT count(*)::int FROM messages m
          WHERE m.room_id = r.id AND m.hidden_at IS NULL AND m.deleted_at IS NULL) AS total,
        (SELECT count(*)::int FROM messages m
          WHERE m.room_id = r.id AND m.hidden_at IS NULL AND m.deleted_at IS NULL
            AND m.sender_id IS DISTINCT FROM ${userId}
            AND (c.last_read_message_id IS NULL OR (m.created_at, m.id) >
                 (SELECT created_at, id FROM messages WHERE id = c.last_read_message_id))) AS unread
      FROM unnest(${roomIds}::text[]) AS r(id)
      LEFT JOIN room_read_cursors c ON c.room_id = r.id AND c.user_id = ${userId}`;
    const p = this.redis.client.pipeline();
    for (const r of rows) p.hsetnx(SEQ, r.room_id, String(r.total));
    await p.exec();
    const seqs = await this.redis.client.hmget(SEQ, ...rows.map((r) => r.room_id));
    const w = this.redis.client.pipeline();
    rows.forEach((r, i) => {
      w.hset(readKey(userId), r.room_id, String(Math.max(0, Number(seqs[i]) - r.unread)));
    });
    w.expire(readKey(userId), READ_TTL_SEC);
    await w.exec();
    return new Map(rows.map((r) => [r.room_id, r.unread]));
  }

  /** Tin mới vào phòng: seq+1; người gửi coi như đã đọc tới đây */
  async onMessage(roomId: string, senderId: string | null): Promise<void> {
    const seq = await this.redis.client.hincrby(SEQ, roomId, 1);
    if (senderId) await this.redis.client.hset(readKey(senderId), roomId, String(seq));
  }

  /** Đọc hết phòng: cursor DB (nguồn sự thật khi Redis mất) + seq-đọc = seq hiện tại */
  async markRead(userId: string, roomId: string): Promise<void> {
    const last = await this.prisma.db.message.findFirst({
      where: { roomId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (last) {
      await this.prisma.db.roomReadCursor.upsert({
        where: { userId_roomId: { userId, roomId } },
        create: { userId, roomId, lastReadMessageId: last.id },
        update: { lastReadMessageId: last.id },
      });
    }
    const seq = await this.redis.client.hget(SEQ, roomId);
    if (seq === null) {
      await this.redis.client.hdel(readKey(userId), roomId);
      return;
    }
    await this.redis.client
      .pipeline()
      .hset(readKey(userId), roomId, seq)
      .expire(readKey(userId), READ_TTL_SEC)
      .exec();
  }
}
