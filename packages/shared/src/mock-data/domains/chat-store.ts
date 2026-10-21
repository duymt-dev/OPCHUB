import type { ChatMessage, Message, MessageKind } from '../../api-domains';
import { members } from '../../fixtures';
import { IMAGE_MESSAGES, SYSTEM_SENDER, TOPIC_AUTHORS, UNREAD_SEED } from './chat-seed';
import { roomIdOf } from './community';
import { currentMockGroupOwner } from './group-lock-jobs';
import { mockDb, type MockDb } from './store';

/**
 * Phần mở rộng của CSDL giả cho Chat nhóm. Giữ trong WeakMap theo đối tượng MockDb hiện tại
 * để `resetMockDb()` tự dựng lại mà không phải sửa store.ts.
 */

export interface MessageExt {
  kind: MessageKind;
  senderId: string | null;
  replyTo: { name: string; text: string } | null;
  /** Private reference for current quote visibility; never serialized to Portal. */
  replyToId?: string | null;
  reportedBy: Set<string>;
  clientMsgId: string | null;
}

export interface TopicMeta {
  createdById: string | null;
  createdByName: string;
}

export interface ChatState {
  ext: Map<string, MessageExt>;
  topics: Map<string, TopicMeta>;
  /** roomId → messageId đã ghim, mới → cũ */
  pins: Map<string, string[]>;
  /** userId → roomId → số tin chưa đọc */
  unread: Map<string, Map<string, number>>;
}

const states = new WeakMap<MockDb, ChatState>();

const memberIdByName = new Map(members.map((m) => [m.name, m.id]));

export const userNameOf = (userId: string) => members.find((m) => m.id === userId)?.name ?? userId;

function seedExt(db: MockDb): Map<string, MessageExt> {
  const out = new Map<string, MessageExt>();
  for (const list of db.messages.values())
    for (const m of list) {
      const img = IMAGE_MESSAGES.get(m.id);
      if (img) m.attachment = { name: img, size: '', ext: 'IMG' };
      out.set(m.id, {
        kind: img ? 'image' : m.attachment ? 'file' : 'text',
        senderId: memberIdByName.get(m.sender.name) ?? null,
        replyTo: null,
        reportedBy: new Set(),
        clientMsgId: null,
      });
    }
  return out;
}

function seedTopics(): Map<string, TopicMeta> {
  return new Map(
    Object.entries(TOPIC_AUTHORS).map(([k, name]) => {
      const [gid = '', rk = ''] = k.split(':');
      return [
        roomIdOf(gid, rk),
        { createdById: memberIdByName.get(name) ?? null, createdByName: name },
      ];
    }),
  );
}

function seedPins(db: MockDb): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [roomId, list] of db.messages) {
    const ids = list.filter((m) => m.pinned).map((m) => m.id);
    if (ids.length) out.set(roomId, ids);
  }
  return out;
}

function seedUnread(): Map<string, Map<string, number>> {
  return new Map(
    Object.entries(UNREAD_SEED).map(([uid, rooms]) => [
      uid,
      new Map(
        Object.entries(rooms).map(([k, n]) => {
          const [gid = '', rk = ''] = k.split(':');
          return [roomIdOf(gid, rk), n];
        }),
      ),
    ]),
  );
}

export function chatState(): ChatState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { ext: seedExt(db), topics: seedTopics(), pins: seedPins(db), unread: seedUnread() };
    states.set(db, s);
  }
  return s;
}

export const isGroupOwner = (userId: string, groupId: string) =>
  currentMockGroupOwner(groupId) === userId;

export const isGroupMember = (userId: string, groupId: string) =>
  mockDb().groupMembers.get(userId)?.get(groupId) === 'member';

export function findChatMessage(id: string): Message | undefined {
  for (const list of mockDb().messages.values()) {
    const m = list.find((x) => x.id === id);
    if (m) return m;
  }
  return undefined;
}

export const groupIdOfRoom = (roomId: string) =>
  mockDb().rooms.find((r) => r.id === roomId)?.groupId;

/** Chữ hiển thị ngắn của tin (banner ghim, trả lời, tin cuối) */
export function previewText(m: Message, kind: MessageKind): string {
  if (kind === 'image') return '[Ảnh]';
  return m.body || m.attachment?.name || '';
}

/** Message (seed) + phần mở rộng → DTO theo góc nhìn người gọi */
export function toChatMessage(m: Message, userId: string): ChatMessage {
  const s = chatState();
  const e = s.ext.get(m.id);
  const me = userNameOf(userId);
  const gid = groupIdOfRoom(m.roomId) ?? '';
  const senderId = e?.senderId ?? null;
  const isSystem = m.sender.name === SYSTEM_SENDER;
  const isOwner = senderId !== null && isGroupOwner(senderId, gid);
  // D-48: không đưa `isSimulated` ra Portal
  const pub: Omit<Message, 'isSimulated'> & { isSimulated?: boolean } = { ...m };
  delete pub.isSimulated;
  const hidden = !!m.hiddenAt;
  const quote = e?.replyTo;
  const target = e?.replyToId ? findChatMessage(e.replyToId) : undefined;
  const replyTo = e?.replyToId && (!target || target.hiddenAt) ? null : (quote ?? null);
  return {
    ...pub,
    ...(hidden ? { body: '', attachment: null, reactions: [] } : {}),
    pinned: !hidden && (s.pins.get(m.roomId) ?? []).includes(m.id),
    kind: e?.kind ?? 'text',
    senderId,
    senderRole: isSystem ? 'system' : isOwner ? 'owner' : null,
    replyTo: hidden ? null : replyTo,
    reportedByMe: e?.reportedBy.has(userId) ?? false,
    myReactions: hidden ? [] : m.reactions.filter((r) => r.names.includes(me)).map((r) => r.emoji),
    clientMsgId: e?.clientMsgId ?? null,
  };
}
