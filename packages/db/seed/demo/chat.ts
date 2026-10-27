import { communities } from '@opchub/shared/fixtures';
import {
  buildMessages,
  buildReports,
  buildRooms,
  IMAGE_MESSAGES,
  MESSAGE_REACTIONS,
  PINNED_MESSAGES,
  REPORT_SEED,
  roomIdOf,
  UNREAD_SEED,
} from '@opchub/shared/mock-domains';
import type { MessageKind } from '../../src/index';
import type { DbTx } from '../../src/client';
import { requireUserId, userIdByName } from './people';

/**
 * Domain chat + moderation: tin nhắn phòng (id `<phòng>-<i>` như mock), reaction, ghim,
 * con trỏ đã đọc của TK demo (UNREAD_SEED), ca kiểm duyệt REPORT_SEED + lượt báo.
 */

interface SeedMessage {
  id: string;
  roomId: string;
  senderId: string | null;
  kind: MessageKind;
  body: string;
  attachment: { name: string; size: string; ext: string } | null;
  createdAt: Date;
  hiddenAt: Date | null;
  deletedAt?: Date;
}

/** Mock có tin cho phòng không tồn tại (`c1:board`) → bỏ (Q-B62-7) */
function roomMessages(): SeedMessage[] {
  const rooms = new Set(buildRooms().map((r) => r.id));
  const out: SeedMessage[] = [];
  for (const [roomId, list] of buildMessages()) {
    if (!rooms.has(roomId)) continue;
    list.forEach((m, i) => {
      const img = IMAGE_MESSAGES.get(m.id);
      out.push({
        id: m.id,
        roomId,
        senderId: userIdByName(m.sender.name),
        kind: img ? 'image' : m.attachment ? 'file' : 'text',
        body: m.body,
        attachment: img ? { name: img, size: '', ext: 'IMG' } : m.attachment,
        // +i ms: các tin cùng giờ ("Hôm qua") giữ đúng thứ tự seed trên keyset (created_at, id)
        createdAt: new Date(Date.parse(m.createdAt) + i),
        hiddenAt: null,
      });
    });
  }
  return out;
}

const HIDDEN_AT = new Date(Date.UTC(2026, 9, 16, 8, 0));
const generalOfGroupName = new Map(communities.map((c) => [c.name, roomIdOf(c.id, 'general')]));

/**
 * Tin bị báo cáo (REPORT_SEED) thuộc phòng Chung của nhóm ghi trong ca — id `rpt-<ca>`. Prototype v4
 * chỉ có các ca này ở Admin, phòng chat không có dòng "đã bị ẩn" (D-89) → tin đặt `hidden_at` và
 * `deleted_at` (gỡ khỏi phòng trước V4); ca kiểm duyệt vẫn trỏ tới tin để Admin xem nội dung.
 */
function reportedMessages(): SeedMessage[] {
  const reports = buildReports();
  return REPORT_SEED.map((r) => {
    const roomId = generalOfGroupName.get(r.room);
    if (!roomId) throw new Error(`Seed demo: không có nhóm "${r.room}"`);
    return {
      id: `rpt-${r.id}`,
      roomId,
      senderId: requireUserId(r.who),
      kind: 'text' as const,
      body: r.text,
      attachment: null,
      createdAt: new Date(reports.find((x) => x.id === r.id)?.createdAt ?? 0),
      hiddenAt: HIDDEN_AT,
      deletedAt: HIDDEN_AT,
    };
  });
}

export async function seedMessages(tx: DbTx): Promise<SeedMessage[]> {
  const all = [...roomMessages(), ...reportedMessages()];
  await tx.message.createMany({
    data: all.map(({ attachment, ...m }) => ({
      ...m,
      ...(attachment ? { attachment } : {}),
      updatedAt: m.createdAt,
    })),
  });
  await seedReactionsAndPins(tx);
  return all;
}

/** Khoá `<nhóm>:<phòng>:<i>` của mock → id tin `<nhóm>-<phòng>-<i>` */
const messageIdOf = (key: string) => key.replace(/:/g, '-');

async function seedReactionsAndPins(tx: DbTx): Promise<void> {
  const t0 = Date.UTC(2026, 9, 16, 2, 30);
  await tx.messageReaction.createMany({
    data: Object.entries(MESSAGE_REACTIONS).flatMap(([key, byEmoji]) =>
      Object.entries(byEmoji).flatMap(([emoji, names], e) =>
        names.map((name, n) => ({
          messageId: messageIdOf(key),
          userId: requireUserId(name),
          emoji,
          createdAt: new Date(t0 + e * 60_000 + n * 1000),
        })),
      ),
    ),
  });
  await tx.pinnedMessage.createMany({
    data: PINNED_MESSAGES.map((key) => {
      const [gid = '', rk = ''] = key.split(':');
      return { roomId: roomIdOf(gid, rk), messageId: messageIdOf(key), pinnedBy: 'm1' };
    }),
  });
}

/**
 * Chưa đọc (S-04/S-05) dựng lại từ `room_read_cursors`: phòng có N chưa đọc → con trỏ đặt ở tin
 * thứ N tính từ cuối; phòng còn lại → tin cuối. Phòng ít tin hơn N (c1:qa 3 > 2 tin) → không đặt
 * con trỏ = mọi tin đều chưa đọc (Q-B62-8). Redis `chat:seq`/`chat:read:*` phải xoá để dựng lại.
 */
export async function seedReadCursors(tx: DbTx, msgs: readonly SeedMessage[]): Promise<void> {
  const rows: { userId: string; roomId: string; lastReadMessageId: string }[] = [];
  const byRoom = new Map<string, SeedMessage[]>();
  for (const m of msgs.filter((x) => !x.hiddenAt)) {
    byRoom.set(m.roomId, [...(byRoom.get(m.roomId) ?? []), m]);
  }
  for (const [userId, unread] of Object.entries(UNREAD_SEED)) {
    for (const [roomId, list] of byRoom) {
      const key = roomId.replace(/^(c\d+)-/, '$1:');
      const others = list.filter((m) => m.senderId !== userId);
      const n = unread[key] ?? 0;
      const target = others[others.length - 1 - n];
      if (target) rows.push({ userId, roomId, lastReadMessageId: target.id });
    }
  }
  await tx.roomReadCursor.createMany({ data: rows });
}

/** Ca kiểm duyệt đang mở + lượt báo của thành viên (reporter_count khớp số dòng message_flags) */
export async function seedReports(tx: DbTx): Promise<void> {
  const reports = buildReports();
  await tx.report.createMany({
    data: reports.map((r) => ({
      id: r.id,
      messageId: `rpt-${r.id}`,
      source: r.source,
      reason: r.reason,
      hit: r.hit,
      reporterCount: r.reporterCount,
      status: 'open' as const,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.createdAt),
    })),
  });
  const reporters = ['m3', 'm5', 'm7', 'm8'];
  await tx.messageFlag.createMany({
    data: reports.flatMap((r) =>
      reporters.slice(0, r.reporterCount).map((userId) => ({
        messageId: `rpt-${r.id}`,
        userId,
        reason: r.reason,
        createdAt: new Date(r.createdAt),
      })),
    ),
  });
}
