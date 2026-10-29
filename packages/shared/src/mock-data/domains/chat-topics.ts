import type {
  AdminRoom,
  GroupFile,
  GroupFilePage,
  GroupFileQuery,
  RoomRename,
} from '../../api-domains';
import { DEFAULT_ROOM_KEYS, type DefaultRoomKey, ROOM_ADMIN_MESSAGES } from '../../api-domains';
import { recordAudit } from './audit-store';
import { chatState, isGroupMember } from './chat-store';
import { groupAdminExt } from './group-admin-state';
import { mockDb } from './store';
import { conflict, notFound, ok, type MockResult } from './util';

/**
 * TIP-V42-709 (MSW, như server): tab "File chia sẻ" theo nhóm (D-98) và Admin đổi tên / xoá mềm chủ đề (D-111).
 * Xoá mềm: gỡ phòng khỏi danh sách Portal (`db.rooms`), tin giữ nguyên trong `db.messages`.
 */

const forbidden = (message: string): MockResult<never> => ({
  ok: false,
  status: 403,
  code: 'FORBIDDEN',
  message,
});

const keyOf = (roomId: string, groupId: string) => roomId.slice(groupId.length + 1);
const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Mọi file + ảnh còn hiển thị của chủ đề còn sống trong nhóm, mới nhất trước */
function allFiles(groupId: string): GroupFile[] {
  const db = mockDb();
  const s = chatState();
  return db.rooms
    .filter((r) => r.groupId === groupId)
    .flatMap((r) =>
      (db.messages.get(r.id) ?? []).flatMap((m): GroupFile[] => {
        const kind = s.ext.get(m.id)?.kind;
        if (m.hiddenAt || !m.attachment || (kind !== 'file' && kind !== 'image')) return [];
        return [
          {
            messageId: m.id,
            roomId: r.id,
            roomKey: keyOf(r.id, groupId),
            roomName: r.name,
            name: m.attachment.name,
            size: kind === 'image' ? '' : m.attachment.size,
            ext: kind === 'image' ? 'IMG' : m.attachment.ext,
            kind: kind === 'image' ? 'img' : 'doc',
            sender: m.sender.name,
            createdAt: m.createdAt,
            url: m.attachment.url ?? null,
          },
        ];
      }),
    )
    .sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.messageId.localeCompare(a.messageId),
    );
}

/** `GET /groups/:id/files` — chỉ thành viên nhóm; chip đếm theo toàn bộ; keyset theo id tin */
export function groupFiles(
  userId: string,
  groupId: string,
  q: GroupFileQuery,
): MockResult<GroupFilePage> {
  if (!mockDb().groups.some((g) => g.id === groupId)) return notFound('Không tìm thấy nhóm');
  if (!isGroupMember(userId, groupId)) return forbidden('Chỉ thành viên nhóm mới xem được');
  const all = allFiles(groupId);
  const term = norm(q.q);
  const hits = all.filter(
    (f) =>
      (q.kind === 'all' || f.kind === q.kind) &&
      (!term || norm(`${f.name} ${f.sender}`).includes(term)),
  );
  const from = q.before ? hits.findIndex((f) => f.messageId === q.before) + 1 : 0;
  const items = hits.slice(from, from + q.size);
  const more = from + q.size < hits.length;
  return ok({
    items,
    nextCursor: more ? (items.at(-1)?.messageId ?? null) : null,
    counts: {
      all: all.length,
      doc: all.filter((f) => f.kind === 'doc').length,
      img: all.filter((f) => f.kind === 'img').length,
    },
  });
}

/** Chủ đề còn sống của nhóm (Admin › Nhóm › form) */
export const adminRoomsOf = (groupId: string): AdminRoom[] =>
  mockDb()
    .rooms.filter((r) => r.groupId === groupId)
    .map((r) => ({
      id: r.id,
      key: keyOf(r.id, groupId),
      name: r.name,
      description: r.description,
      isDefault: r.isDefault,
    }));

const locked = (): MockResult<never> => conflict(ROOM_ADMIN_MESSAGES.defaultLocked);

const isDefaultKey = (k: string): k is DefaultRoomKey =>
  (DEFAULT_ROOM_KEYS as readonly string[]).includes(k);
const sameName = (a: string, b: string) => a.toLocaleLowerCase('vi') === b.toLocaleLowerCase('vi');

/** Form Admin (roomKeys / extraRooms) theo phòng còn sống — như server dẫn từ `rooms` */
function syncExt(groupId: string, key: string, before: string, next: AdminRoom | null) {
  const ext = groupAdminExt(groupId);
  if (isDefaultKey(key)) {
    if (!next) ext.roomKeys = ext.roomKeys.filter((k) => k !== key);
    return;
  }
  ext.extraRooms = next
    ? ext.extraRooms.map((x) =>
        sameName(x.name, before) ? { name: next.name, description: next.description } : x,
      )
    : ext.extraRooms.filter((x) => !sameName(x.name, before));
}

/** D-111 `PATCH /admin/groups/:id/rooms/:roomId` — "Chung" chỉ đổi mô tả; trùng tên → 409 */
export function renameMockRoom(
  actorId: string,
  groupId: string,
  roomId: string,
  input: RoomRename,
): MockResult<AdminRoom> {
  const room = mockDb().rooms.find((r) => r.id === roomId && r.groupId === groupId);
  if (!room) return notFound(ROOM_ADMIN_MESSAGES.notFound);
  const name = input.name.trim();
  if (room.isDefault && name !== room.name) return locked();
  const low = name.toLocaleLowerCase('vi');
  const taken = mockDb().rooms.some(
    (r) => r.groupId === groupId && r.id !== roomId && r.name.toLocaleLowerCase('vi') === low,
  );
  if (taken) return conflict(ROOM_ADMIN_MESSAGES.duplicate);
  const before = room.name;
  room.name = name;
  room.description = input.description.trim();
  recordAudit(actorId, 'group.topic_rename', roomId, `Đổi tên chủ đề ${before} → ${name}`);
  const next: AdminRoom = {
    id: room.id,
    key: keyOf(room.id, groupId),
    name: room.name,
    description: room.description,
    isDefault: room.isDefault,
  };
  syncExt(groupId, next.key, before, next);
  return ok(next);
}

/** D-111 `DELETE /admin/groups/:id/rooms/:roomId` — xoá mềm; "Chung" → 409; tin giữ */
export function deleteMockRoom(
  actorId: string,
  groupId: string,
  roomId: string,
): MockResult<{ id: string }> {
  const db = mockDb();
  const room = db.rooms.find((r) => r.id === roomId && r.groupId === groupId);
  if (!room) return notFound(ROOM_ADMIN_MESSAGES.notFound);
  if (room.isDefault) return locked();
  db.rooms = db.rooms.filter((r) => r.id !== roomId);
  for (const per of chatState().unread.values()) per.delete(roomId);
  syncExt(groupId, keyOf(roomId, groupId), room.name, null);
  recordAudit(actorId, 'group.topic_delete', roomId, `Xoá chủ đề ${room.name}`);
  return ok({ id: roomId });
}
