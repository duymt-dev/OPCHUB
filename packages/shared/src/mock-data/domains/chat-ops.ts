import { HIDDEN_MESSAGE_TEXT } from '../../api-domains';
import type {
  ChatGroup,
  ChatOverview,
  ChatUnread,
  ChatRoom,
  GroupItem,
  Room,
  RoomFile,
  RoomMember,
  RoomPin,
} from '../../api-domains';
import { PEOPLE } from './chat-seed';
import { currentMockGroupOwner } from './group-lock-jobs';
import { chatState, isGroupMember, isGroupOwner, previewText } from './chat-store';
import { mockDb } from './store';
import { avatarUrl, notFound, ok, type MockResult } from './util';

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
  };
}

export function chatOverview(userId: string): ChatOverview {
  const all = mockDb().groups.map((g) => toChatGroup(userId, g));
  return {
    joined: all.filter((g) => g.myStatus === 'member'),
    others: all.filter((g) => g.myStatus !== 'member'),
  };
}

/** `GET /me/chat/unread` (NA-25): cộng từ số chưa đọc của các phòng thuộc nhóm đã tham gia */
export function chatUnread(userId: string): ChatUnread {
  const mine = chatState().unread.get(userId);
  const joined = mockDb().groupMembers.get(userId);
  const byGroup: Record<string, number> = {};
  const byRoom: Record<string, number> = {};
  let total = 0;
  for (const r of mockDb().rooms) {
    if (joined?.get(r.groupId) !== 'member') continue;
    const n = mine?.get(r.id) ?? 0;
    byRoom[r.id] = n;
    byGroup[r.groupId] = (byGroup[r.groupId] ?? 0) + n;
    total += n;
  }
  return { total, byGroup, byRoom };
}

function toChatRoom(userId: string, r: Room, memberCount: number): ChatRoom {
  const s = chatState();
  const last = (mockDb().messages.get(r.id) ?? []).findLast((m) => !m.hiddenAt);
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
    // GR-R02: mẫu D_P không phải thành viên thật — người đầu là Giảng viên như prototype ("Điều phối" cũ)
    groupRole: i === 0 ? ('lecturer' as const) : ('member' as const),
  }));
  return ok({ items, total: g.memberCount });
}

export function roomPins(roomId: string): RoomPin[] {
  const db = mockDb();
  const s = chatState();
  const list = db.messages.get(roomId) ?? [];
  return (s.pins.get(roomId) ?? []).flatMap((id) => {
    const m = list.find((x) => x.id === id);
    // Tin thành viên bị ẩn giữ ghim với câu giữ chỗ (D-77, prototype); tin bot ẩn thì bỏ (REQ-141)
    if (!m || (m.hiddenAt && m.isSimulated)) return [];
    return [
      {
        messageId: id,
        senderName: m.sender.name,
        text: m.hiddenAt ? HIDDEN_MESSAGE_TEXT : previewText(m, s.ext.get(id)?.kind ?? 'text'),
      },
    ];
  });
}

export function roomFiles(roomId: string): RoomFile[] {
  const s = chatState();
  return (mockDb().messages.get(roomId) ?? [])
    .filter((m) => !m.hiddenAt && m.attachment && s.ext.get(m.id)?.kind === 'file')
    .map((m) => ({
      messageId: m.id,
      name: m.attachment?.name ?? '',
      size: m.attachment?.size ?? '',
      ext: m.attachment?.ext ?? '',
      url: m.attachment?.url ?? null,
    }));
}

/** D-117 B6: `GET /messages/:id/attachment` — link tải (MSW không ký, trả URL đính kèm) */
export function attachmentLink(messageId: string): MockResult<{ url: string }> {
  for (const list of mockDb().messages.values()) {
    const m = list.find((x) => x.id === messageId);
    if (m) return !m.hiddenAt && m.attachment?.url ? ok({ url: m.attachment.url }) : notFound();
  }
  return notFound();
}

export const ownerOfGroup = (groupId: string) => currentMockGroupOwner(groupId);
