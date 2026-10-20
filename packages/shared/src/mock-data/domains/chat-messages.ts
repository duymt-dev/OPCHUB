import type {
  ChatMessage,
  JoinResult,
  Message,
  Report,
  ReportMessageRequest,
} from '../../api-domains';
import type { z } from 'zod';
import type { Attachment, sendMessageSchema } from '../../api-domains';
import { cleanFileName, fileExtLabel, formatFileSize } from '../../api-domains/uploads';
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
import { recordLive } from './live-feed';
import { admitMockBotReply } from './bot-reply-admission';
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
    .filter((m) => !m.hiddenAt)
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
  const quoted = input.replyTo ? findChatMessage(input.replyTo) : undefined;
  if (input.replyTo && (!quoted || quoted.roomId !== roomId))
    return notFound('Không tìm thấy tin được trả lời');
  const dup = list.find(
    (m) =>
      s.ext.get(m.id)?.clientMsgId === input.clientMsgId && s.ext.get(m.id)?.senderId === userId,
  );
  if (dup) return ok(toChatMessage(dup, userId));
  const attachment = input.kind === 'text' ? null : mockAttachment(input.kind, input.attachment);
  if (input.kind !== 'text' && !attachment) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'Tệp không hợp lệ' };
  }
  const name = userNameOf(userId);
  const m: Message = {
    id: nextId(`${roomId}-m`),
    roomId,
    sender: { name, avatarUrl: avatarUrl(SENDER_PHOTOS[name]) },
    body: input.kind === 'text' ? input.body : '',
    attachment,
    reactions: [],
    pinned: false,
    isSimulated: false,
    createdAt: nowIso(),
  };
  list.push(m);
  mockDb().messages.set(roomId, list);
  const gid = groupIdOfRoom(roomId) ?? '';
  const group = mockDb().groups.find((g) => g.id === gid);
  // NA-25: +1 chưa đọc cho thành viên khác của nhóm (tin của mình không tính)
  for (const [uid, mine] of mockDb().groupMembers) {
    if (uid === userId || mine.get(gid) !== 'member') continue;
    const counts = s.unread.get(uid) ?? new Map<string, number>();
    counts.set(roomId, (counts.get(roomId) ?? 0) + 1);
    s.unread.set(uid, counts);
  }
  recordLive({
    memberName: name,
    avatarUrl: m.sender.avatarUrl,
    kind: 'msg',
    target: group?.name ?? '',
    at: m.createdAt,
  });
  s.ext.set(m.id, {
    kind: input.kind,
    senderId: userId,
    replyToId: input.replyTo ?? null,
    replyTo: quoted
      ? {
          name: quoted.sender.name,
          text: previewText(quoted, s.ext.get(quoted.id)?.kind ?? 'text'),
        }
      : null,
    reportedBy: new Set(),
    clientMsgId: input.clientMsgId,
  });
  admitMockBotReply(m.id);
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

/**
 * BUG-010 (MSW như server `resolveFile`): URL phải là object MSW đã presign đúng kind
 * (`/uploads/chat-file-…` | `/uploads/chat-image-…`); chuẩn hoá tên/đuôi/dung lượng.
 */
function mockAttachment(kind: 'file' | 'image', a: Attachment | undefined): Attachment | null {
  const prefix = kind === 'image' ? 'chat-image-' : 'chat-file-';
  if (!a?.url || !a.url.includes(`/uploads/${prefix}`)) return null;
  const name = cleanFileName(a.name);
  const type = a.contentType ?? '';
  return {
    name,
    ext: kind === 'image' ? 'IMG' : fileExtLabel(name, type),
    size: formatFileSize(a.bytes ?? 0),
    bytes: a.bytes ?? 0,
    contentType: type,
    url: a.url,
  };
}
