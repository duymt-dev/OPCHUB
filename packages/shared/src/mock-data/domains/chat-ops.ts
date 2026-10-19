import type {
  ChatGroup,
  ChatOverview,
  ChatRoom,
  CreateTopicRequest,
  GroupItem,
  Room,
  RoomFile,
  RoomMember,
  RoomPin,
} from '../../api-domains';
import { GROUP_OWNERS, PEOPLE } from './chat-seed';
import { chatState, isGroupMember, isGroupOwner, previewText, userNameOf } from './chat-store';
import { listJoinRequests } from './ops-community';
import { mockDb, nextId } from './store';
import { avatarUrl, conflict, notFound, ok, type MockResult } from './util';

/** Nghiệp vụ mock Chat nhóm (Portal): rail nhóm, phòng/chủ đề, bảng thông tin */

const forbidden = (message: string): MockResult<never> => ({
  ok: false,
  status: 403,
  code: 'FORBIDDEN',
  message,
});

/** Số online hiển thị (prototype: 4% thành viên nhóm, 2% cho phòng, tối thiểu 1 / 3) */
const groupOnline = (members: number) => Math.max(1, Math.round(members * 0.04));
const roomOnline = (members: number) => Math.max(3, Math.round(members * 0.02));

const roomKeyOf = (r: Room) => r.id.slice(r.groupId.length + 1);

function toChatGroup(userId: string, g: Omit<GroupItem, 'myStatus'>): ChatGroup {
  const s = chatState();
  const status = mockDb().groupMembers.get(userId)?.get(g.id) ?? null;
  const mine = s.unread.get(userId);
  let unread = 0;
  for (const r of mockDb().rooms) if (r.groupId === g.id) unread += mine?.get(r.id) ?? 0;
  const owner = isGroupOwner(userId, g.id);
  return {
    ...g,
    myStatus: status,
    // BUG-011: ảnh bìa của nhóm (null → FE dùng ảnh mặc định tự host)
    thumbUrl: g.coverUrl,
    online: groupOnline(g.memberCount),
    unread,
    isOwner: owner,
    pendingRequests: owner ? listJoinRequests(g.id).length : 0,
  };
}

export function chatOverview(userId: string): ChatOverview {
  const all = mockDb().groups.map((g) => toChatGroup(userId, g));
  return {
    joined: all.filter((g) => g.myStatus === 'member'),
    others: all.filter((g) => g.myStatus !== 'member'),
  };
}

function toChatRoom(userId: string, r: Room, memberCount: number): ChatRoom {
  const s = chatState();
  const last = (mockDb().messages.get(r.id) ?? []).at(-1);
  const meta = s.topics.get(r.id);
  return {
    ...r,
    key: roomKeyOf(r),
    createdBy: r.isDefault ? null : (meta?.createdByName ?? null),
    mine: !r.isDefault && meta?.createdById === userId,
    lastMessage: last
      ? {
          senderName: last.sender.name,
          text: previewText(last, s.ext.get(last.id)?.kind ?? 'text'),
        }
      : null,
    unread: s.unread.get(userId)?.get(r.id) ?? 0,
    online: roomOnline(memberCount),
    memberCount,
  };
}

export function listChatRooms(userId: string, groupId: string): MockResult<ChatRoom[]> {
  const g = mockDb().groups.find((x) => x.id === groupId);
  if (!g) return notFound('Không tìm thấy nhóm');
  if (!isGroupMember(userId, groupId)) return forbidden('Chỉ thành viên nhóm mới xem được');
  const rooms = mockDb().rooms.filter((r) => r.groupId === groupId);
  return ok(rooms.map((r) => toChatRoom(userId, r, g.memberCount)));
}

export function createTopic(
  userId: string,
  groupId: string,
  input: CreateTopicRequest,
): MockResult<ChatRoom> {
  const db = mockDb();
  const g = db.groups.find((x) => x.id === groupId);
  if (!g) return notFound('Không tìm thấy nhóm');
  if (!isGroupMember(userId, groupId)) return forbidden('Chỉ thành viên nhóm mới tạo được chủ đề');
  const name = input.name.toLowerCase();
  const dup = db.rooms.some((r) => r.groupId === groupId && r.name.toLowerCase() === name);
  if (dup) return conflict('Chủ đề này đã có trong nhóm');
  const key = nextId('r');
  const room: Room = {
    id: `${groupId}-${key}`,
    groupId,
    name: input.name,
    description: input.description || 'Chủ đề mới',
    isDefault: false,
  };
  db.rooms.push(room);
  db.messages.set(room.id, []);
  chatState().topics.set(room.id, { createdById: userId, createdByName: userNameOf(userId) });
  return ok(toChatRoom(userId, room, g.memberCount));
}

/** Chỉ người tạo được xoá chủ đề của mình; phòng Chung không xoá được */
export function deleteTopic(userId: string, roomId: string): MockResult<{ id: string }> {
  const db = mockDb();
  const i = db.rooms.findIndex((r) => r.id === roomId);
  const room = db.rooms[i];
  if (!room) return notFound('Không tìm thấy chủ đề');
  const meta = chatState().topics.get(roomId);
  if (room.isDefault || meta?.createdById !== userId)
    return forbidden('Bạn chỉ xoá được chủ đề do mình tạo');
  db.rooms.splice(i, 1);
  db.messages.delete(roomId);
  return ok({ id: roomId });
}

export function markRoomRead(userId: string, roomId: string): MockResult<{ id: string }> {
  chatState().unread.get(userId)?.delete(roomId);
  return ok({ id: roomId });
}

/** Thành viên hiển thị ở bảng thông tin (mẫu D_P, lệch theo số thành viên như prototype) */
export function roomMembers(roomId: string): MockResult<{ items: RoomMember[]; total: number }> {
  const db = mockDb();
  const room = db.rooms.find((r) => r.id === roomId);
  const g = db.groups.find((x) => x.id === room?.groupId);
  if (!room || !g) return notFound('Không tìm thấy phòng');
  const start = g.memberCount % 6;
  const items = PEOPLE.slice(start, start + 8).map(([org, , , type, name, title, ph], i) => ({
    id: `p${start + i}`,
    name,
    title: `${title} · ${type === 'cn' ? 'Freelancer' : org}`,
    avatarUrl: avatarUrl(ph),
    online: i % 3 !== 2,
    isModerator: i === 0,
  }));
  return ok({ items, total: g.memberCount });
}

export function roomPins(roomId: string): RoomPin[] {
  const db = mockDb();
  const s = chatState();
  const list = db.messages.get(roomId) ?? [];
  return (s.pins.get(roomId) ?? []).flatMap((id) => {
    const m = list.find((x) => x.id === id);
    if (!m) return [];
    return [
      {
        messageId: id,
        senderName: m.sender.name,
        text: previewText(m, s.ext.get(id)?.kind ?? 'text'),
      },
    ];
  });
}

export function roomFiles(roomId: string): RoomFile[] {
  const s = chatState();
  return (mockDb().messages.get(roomId) ?? [])
    .filter((m) => m.attachment && s.ext.get(m.id)?.kind === 'file')
    .map((m) => ({
      messageId: m.id,
      name: m.attachment?.name ?? '',
      size: m.attachment?.size ?? '',
      ext: m.attachment?.ext ?? '',
      url: m.attachment?.url ?? null,
    }));
}

export const ownerOfGroup = (groupId: string) => GROUP_OWNERS[groupId] ?? null;
