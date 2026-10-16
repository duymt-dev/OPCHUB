import type {
  ChatMessage,
  JoinResult,
  Message,
  Report,
  ReportMessageRequest,
} from '../../api-domains';
import type { z } from 'zod';
import type { sendMessageSchema } from '../../api-domains';
import { SENDER_PHOTOS, SYSTEM_SENDER } from './chat-seed';
import {
  chatState,
  findChatMessage,
  groupIdOfRoom,
  isGroupMember,
  isGroupOwner,
  previewText,
  toChatMessage,
  userNameOf,
} from './chat-store';
import { decideJoin, reportMessage } from './ops-community';
import { mockDb, nextId } from './store';
import {
  avatarUrl,
  conflict,
  cursorSlice,
  includesText,
  iso,
  notFound,
  ok,
  type MockResult,
} from './util';

/** Tin nhắn trong phòng chat: đọc, gửi (idempotent), cảm xúc, ghim, báo cáo */

type SendInput = z.output<typeof sendMessageSchema>;

const forbidden = (message: string): MockResult<never> => ({
  ok: false,
  status: 403,
  code: 'FORBIDDEN',
  message,
});

function canAccess(userId: string, roomId: string): MockResult<string> {
  const gid = groupIdOfRoom(roomId);
  if (!gid) return notFound('Không tìm thấy phòng');
  if (!isGroupMember(userId, gid))
    return forbidden('Chỉ thành viên nhóm mới xem và gửi được tin nhắn');
  return ok(gid);
}

/** Mới → cũ, cursor `before` (keyset theo id tin cũ nhất đã có) */
export function listChatMessages(
  userId: string,
  roomId: string,
  q: string | undefined,
  before: string | undefined,
  size: number,
) {
  const access = canAccess(userId, roomId);
  if (!access.ok) return access;
  const all = [...(mockDb().messages.get(roomId) ?? [])]
    .reverse()
    .filter((m) => includesText(m.body, q) || includesText(m.attachment?.name ?? '', q));
  const page = cursorSlice(all, before, size);
  return ok({
    items: page.items.map((m) => toChatMessage(m, userId)),
    nextCursor: page.nextCursor,
  });
}

/** Giờ gửi của mock: đồng hồ trình duyệt (parity cố định giờ bằng page.clock) */
const nowIso = () => iso(Date.now());

export function sendChatMessage(
  userId: string,
  roomId: string,
  input: SendInput,
): MockResult<ChatMessage> {
  const access = canAccess(userId, roomId);
  if (!access.ok) return access;
  const s = chatState();
  const list = mockDb().messages.get(roomId) ?? [];
  const dup = list.find(
    (m) =>
      s.ext.get(m.id)?.clientMsgId === input.clientMsgId && s.ext.get(m.id)?.senderId === userId,
  );
  if (dup) return ok(toChatMessage(dup, userId));
  const quoted = input.replyTo ? findChatMessage(input.replyTo) : undefined;
  const name = userNameOf(userId);
  const m: Message = {
    id: nextId(`${roomId}-m`),
    roomId,
    sender: { name, avatarUrl: avatarUrl(SENDER_PHOTOS[name]) },
    body: input.kind === 'text' ? input.body : '',
    attachment: input.kind === 'text' ? null : (input.attachment ?? null),
    reactions: [],
    pinned: false,
    isSimulated: false,
    createdAt: nowIso(),
  };
  list.push(m);
  mockDb().messages.set(roomId, list);
  s.ext.set(m.id, {
    kind: input.kind,
    senderId: userId,
    replyTo: quoted
      ? {
          name: quoted.sender.name,
          text: previewText(quoted, s.ext.get(quoted.id)?.kind ?? 'text'),
        }
      : null,
    reportedBy: new Set(),
    clientMsgId: input.clientMsgId,
  });
  return ok(toChatMessage(m, userId));
}

export function toggleReaction(
  userId: string,
  messageId: string,
  emoji: string,
): MockResult<ChatMessage> {
  const m = findChatMessage(messageId);
  if (!m) return notFound('Không tìm thấy tin nhắn');
  const access = canAccess(userId, m.roomId);
  if (!access.ok) return access;
  const me = userNameOf(userId);
  const r = m.reactions.find((x) => x.emoji === emoji);
  if (!r) m.reactions.push({ emoji, count: 1, names: [me] });
  else {
    r.names = r.names.includes(me) ? r.names.filter((n) => n !== me) : [...r.names, me];
    r.count = r.names.length;
  }
  m.reactions = m.reactions.filter((x) => x.count > 0);
  return ok(toChatMessage(m, userId));
}

/** D-43: chỉ chủ nhóm ghim / bỏ ghim trong nhóm mình */
export function setPinned(
  userId: string,
  messageId: string,
  pinned: boolean,
): MockResult<ChatMessage> {
  const m = findChatMessage(messageId);
  if (!m) return notFound('Không tìm thấy tin nhắn');
  const gid = groupIdOfRoom(m.roomId) ?? '';
  if (!isGroupOwner(userId, gid)) return forbidden('Chỉ chủ nhóm được ghim tin nhắn');
  const s = chatState();
  const cur = (s.pins.get(m.roomId) ?? []).filter((id) => id !== messageId);
  s.pins.set(m.roomId, pinned ? [messageId, ...cur] : cur);
  return ok(toChatMessage(m, userId));
}

export function reportChatMessage(
  userId: string,
  messageId: string,
  input: ReportMessageRequest,
): MockResult<Report> {
  const e = chatState().ext.get(messageId);
  if (e?.reportedBy.has(userId)) return conflict('Bạn đã báo cáo tin này');
  if (e?.senderId === userId) return forbidden('Không thể báo cáo tin của chính bạn');
  const res = reportMessage(messageId, input);
  if (res.ok) e?.reportedBy.add(userId);
  return res;
}

/** Duyệt / từ chối vào nhóm; duyệt thì phòng Chung có tin hệ thống chào mừng */
export function decideJoinWithNotice(
  userId: string,
  groupId: string,
  uid: string,
  decision: 'approve' | 'reject',
): MockResult<JoinResult> {
  if (!isGroupOwner(userId, groupId)) return forbidden('Chỉ chủ nhóm được duyệt yêu cầu');
  const req = mockDb().joinRequests.find((r) => r.groupId === groupId && r.userId === uid);
  const res = decideJoin(groupId, uid, decision);
  if (!res.ok || decision !== 'approve' || !req) return res;
  const roomId = `${groupId}-general`;
  const list = mockDb().messages.get(roomId) ?? [];
  const m: Message = {
    id: nextId(`${roomId}-m`),
    roomId,
    sender: { name: SYSTEM_SENDER, avatarUrl: null },
    body: `${req.fullName} vừa được duyệt vào nhóm. Chào mừng bạn!`,
    attachment: null,
    reactions: [],
    pinned: false,
    isSimulated: false,
    createdAt: nowIso(),
  };
  list.push(m);
  mockDb().messages.set(roomId, list);
  chatState().ext.set(m.id, {
    kind: 'text',
    senderId: null,
    replyTo: null,
    reportedBy: new Set(),
    clientMsgId: null,
  });
  return res;
}
