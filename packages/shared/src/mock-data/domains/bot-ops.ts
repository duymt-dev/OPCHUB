import type { BotActivity, BotThread, Message } from '../../api-domains';
import { roomIdOf } from './community';
import { BOT_THREAD_SEED, GENERAL_ROOM } from './extras';
import { runScript } from './ops-admin';
import { mockDb, nextId, type MockDb } from './store';
import { conflict, iso, notFound, ok, type MockResult } from './util';

/**
 * Bot tương tác (D-36 → D-41): hội thoại mô phỏng chờ duyệt (D-04), nhật ký worker, audit.
 * WeakMap theo MockDb nên `resetMockDb()` tự dựng lại. Worker thật (BullMQ tick, S-11) sẽ
 * sinh hội thoại + nhật ký; mock chỉ phản hồi thao tác của Admin.
 */

interface ThreadRec {
  id: string;
  scriptId: string | null;
  status: 'pending' | 'posted';
  createdAt: string;
}

export interface BotAuditRow {
  action: string;
  entity: 'persona' | 'script' | 'bot_thread' | 'bot_settings';
  entityId: string;
  at: string;
}

interface BotState {
  threads: ThreadRec[];
  activity: BotActivity[];
  todayCount: number;
  audit: BotAuditRow[];
}

const states = new WeakMap<MockDb, BotState>();

export function botState(): BotState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = {
      threads: BOT_THREAD_SEED.map((t) => ({
        id: t.id,
        scriptId: t.sid,
        status: t.st,
        createdAt: iso(Date.now() - t.ago),
      })),
      activity: [],
      todayCount: 0,
      audit: [],
    };
    states.set(db, s);
  }
  return s;
}

/** Ghi audit_logs cho thao tác Admin (luật 10, BR-13) */
export function auditBot(action: string, entity: BotAuditRow['entity'], entityId: string) {
  botState().audit.unshift({ action, entity, entityId, at: iso(Date.now()) });
}

const groupName = (id: string) => mockDb().groups.find((g) => g.id === id)?.name ?? id;

function toThread(t: ThreadRec): BotThread | null {
  const db = mockDb();
  const sc = db.scripts.find((s) => s.id === t.scriptId);
  if (!sc) return null;
  return {
    id: t.id,
    scriptId: t.scriptId,
    topic: sc.topic,
    groupIds: sc.groupIds,
    groupNames: sc.groupIds.map(groupName),
    status: t.status,
    isAuto: false,
    live: false,
    createdAt: t.createdAt,
    lines: sc.lines.map((l) => {
      const p = db.personas.find((x) => x.id === l.personaId);
      return {
        personaId: l.personaId,
        name: p?.name ?? '?',
        title: p?.title ?? '',
        color: p?.color ?? '#999999',
        avatarUrl: p?.avatarUrl ?? null,
        body: l.body,
      };
    }),
  };
}

export const listBotThreads = (): BotThread[] =>
  botState()
    .threads.map(toThread)
    .filter((t): t is BotThread => t !== null);

/** "Chạy ngay": tạo hội thoại chờ duyệt (D-04) — không đăng thẳng vào nhóm */
export function runBotScript(id: string): MockResult<{ threadId: string; status: 'pending' }> {
  const r = runScript(id);
  if (!r.ok) return r;
  botState().threads.unshift({
    id: r.data.threadId,
    scriptId: id,
    status: 'pending',
    createdAt: iso(Date.now()),
  });
  auditBot('script.run', 'script', id);
  return r;
}

/** Tin mô phỏng vào phòng Chung các nhóm đích (QT-07; is_simulated) */
function postToGroups(t: BotThread) {
  const db = mockDb();
  const at = iso(Date.now());
  for (const gid of t.groupIds) {
    const roomId = roomIdOf(gid, GENERAL_ROOM.id);
    const list = db.messages.get(roomId) ?? [];
    const msgs: Message[] = t.lines.map((l) => ({
      id: nextId(`${roomId}-m`),
      roomId,
      sender: { name: l.name, avatarUrl: l.avatarUrl },
      body: l.body,
      attachment: null,
      reactions: [],
      pinned: false,
      isSimulated: true,
      createdAt: at,
    }));
    db.messages.set(roomId, [...list, ...msgs]);
  }
}

/** Duyệt & đăng — chuyển pending → posted có điều kiện (luật 7) */
export function approveBotThread(
  id: string,
): MockResult<{ id: string; status: 'posted'; groupCount: number }> {
  const s = botState();
  const rec = s.threads.find((x) => x.id === id);
  if (!rec) return notFound('Không tìm thấy hội thoại');
  if (rec.status !== 'pending') return conflict('Hội thoại đã được đăng');
  const t = toThread(rec);
  if (!t) return notFound('Kịch bản của hội thoại đã bị xóa');
  rec.status = 'posted';
  rec.createdAt = iso(Date.now());
  postToGroups(t);
  s.todayCount += t.lines.length * t.groupIds.length;
  s.activity.unshift({
    id: nextId('act'),
    text: `Đã đăng “${t.topic}” vào ${t.groupNames.join(', ')}`,
    createdAt: rec.createdAt,
  });
  const log = mockDb().botLog.find((x) => x.id === id);
  if (log) log.status = 'posted';
  auditBot('bot_thread.approve', 'bot_thread', id);
  return ok({ id, status: 'posted', groupCount: t.groupIds.length });
}

/** "Bỏ" hội thoại chờ duyệt */
export function rejectBotThread(id: string): MockResult<{ id: string }> {
  const s = botState();
  const rec = s.threads.find((x) => x.id === id);
  if (!rec) return notFound('Không tìm thấy hội thoại');
  if (rec.status !== 'pending') return conflict('Chỉ bỏ được hội thoại đang chờ duyệt');
  s.threads = s.threads.filter((x) => x.id !== id);
  const db = mockDb();
  db.botLog = db.botLog.filter((x) => x.id !== id);
  auditBot('bot_thread.reject', 'bot_thread', id);
  return ok({ id });
}

export const botActivity = () => {
  const s = botState();
  return { items: s.activity.slice(0, 40), todayCount: s.todayCount };
};
