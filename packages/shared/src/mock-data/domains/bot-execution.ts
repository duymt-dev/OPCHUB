import type { BotThread, Message } from '../../api-domains';
import { mockDb, nextId } from './store';
import { GENERAL_ROOM } from './extras';
import { roomIdOf } from './community';
import { conflict, iso, notFound, ok, type MockResult } from './util';
import { runScript } from './ops-admin';
import { isBotActiveHour, botTurnDelayMs } from '../../bot/runtime-time';
import { publishMockBotMessage } from './bot-publication';
import { botState } from './bot-state';
import type { BotAuditRow, ThreadRec } from './bot-state-types';
export { botState } from './bot-state';
export type { BotAuditRow } from './bot-state-types';
import { advanceMockReplies } from './bot-reply-worker';

export function auditBot(
  action: string,
  entity: BotAuditRow['entity'],
  entityId: string,
  actorId?: string,
) {
  botState().audit.unshift({
    action,
    entity,
    entityId,
    at: iso(Date.now()),
    ...(actorId ? { actorId } : {}),
  });
}

function toThread(rec: ThreadRec): BotThread | null {
  const db = mockDb();
  if (rec.scriptId && !db.scripts.some((s) => s.id === rec.scriptId)) return null;
  return {
    id: rec.id,
    scriptId: rec.scriptId,
    topic: rec.snapshot.topic,
    groupIds: rec.snapshot.groupIds,
    groupNames: rec.snapshot.groupIds.map((id) => db.groups.find((g) => g.id === id)?.name ?? id),
    status: rec.status,
    isAuto: rec.kind === 'auto',
    live: rec.status === 'running',
    cursor: rec.cursor,
    total: rec.snapshot.lines.length,
    nextAt: rec.nextAt === null ? null : iso(rec.nextAt),
    kind: rec.kind ?? 'script',
    createdAt: rec.createdAt,
    lines: rec.snapshot.lines.map((line) => {
      const p = db.personas.find((p) => p.id === line.personaId);
      return {
        ...line,
        name: p?.name ?? '?',
        title: p?.title ?? '',
        color: p?.color ?? '#999999',
        avatarUrl: p?.avatarUrl ?? null,
      };
    }),
  };
}

/** Deterministic mock worker tick: advance by one real due turn, never approve/batch-post. */
export function advanceMockBot(now = Date.now()): void {
  const db = mockDb();
  const state = botState();
  if (!db.botSettings.enabled || !state.featureEnabled) return;
  for (const rec of state.threads) {
    if (rec.kind === 'reply') continue;
    if (rec.status === 'done' || rec.nextAt === null || rec.nextAt > now) continue;
    const script = db.scripts.find((s) => s.id === rec.scriptId);
    if (!script?.enabled) continue;
    const line = rec.snapshot.lines[rec.cursor];
    const persona = db.personas.find((p) => p.id === line?.personaId);
    let count = 0;
    if (line && persona?.enabled && isBotActiveHour(persona.activeHours, new Date(now))) {
      const groups = rec.snapshot.groupIds.filter((id) => persona.groupIds.includes(id));
      const day = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
      const key = `${persona.id}:${day}`;
      if ((state.daily.get(key) ?? 0) + groups.length <= persona.postsPerDay) {
        for (const group of groups) {
          const roomId = roomIdOf(group, GENERAL_ROOM.id);
          const message: Message = {
            id: `bot-${rec.id}-${rec.cursor}-${roomId}`,
            roomId,
            sender: { name: persona.name, avatarUrl: persona.avatarUrl },
            body: line.body,
            attachment: null,
            reactions: [],
            pinned: false,
            isSimulated: true,
            createdAt: iso(now),
          };
          if (
            publishMockBotMessage(message, {
              threadId: rec.id,
              turn: rec.cursor,
              kind: 'script',
              personaId: persona.id,
            })
          )
            count += 1;
        }
        state.daily.set(key, (state.daily.get(key) ?? 0) + count);
        persona.postCount += count;
      }
    }
    rec.cursor += 1;
    rec.status = rec.cursor >= rec.snapshot.lines.length ? 'done' : 'running';
    rec.nextAt =
      rec.status === 'done' ? null : now + botTurnDelayMs(rec.snapshot.delayMinutes, () => 0);
    state.todayCount += count;
    state.activity.unshift({
      id: nextId('act'),
      text: `${count ? 'Đã đăng' : 'Bỏ'} lượt ${rec.cursor}: ${rec.snapshot.topic}`,
      createdAt: iso(now),
    });
    const log = db.botLog.find((log) => log.id === rec.id);
    if (log) log.status = rec.status;
  }
  advanceMockReplies(now);
}

export function listBotThreads(): BotThread[] {
  advanceMockBot();
  return botState()
    .threads.map(toThread)
    .filter((t): t is BotThread => t !== null);
}

export function runBotScript(
  id: string,
): MockResult<{ threadId: string; status: BotThread['status'] }> {
  const script = mockDb().scripts.find((s) => s.id === id);
  if (!script) return notFound('Không tìm thấy kịch bản');
  if (!script.enabled) return conflict('Kịch bản đang tắt');
  const state = botState();
  const active = state.threads.find((t) => t.scriptId === id && t.status !== 'done');
  if (active) {
    auditBot('script.run', 'script', id);
    return ok({ threadId: active.id, status: active.status });
  }
  if (state.threads.filter((t) => t.status !== 'done').length >= 30)
    return conflict('Đã đạt giới hạn 30 hội thoại đang hoạt động');
  const result = runScript(id);
  if (!result.ok) return result;
  while (state.threads.length >= 30) {
    const oldest = [...state.threads].reverse().find((t) => t.status === 'done');
    if (!oldest) break;
    state.threads = state.threads.filter((t) => t.id !== oldest.id);
    mockDb().botLog = mockDb().botLog.filter((row) => row.id !== oldest.id);
  }
  state.threads.unshift({
    id: result.data.threadId,
    scriptId: id,
    status: 'scheduled',
    createdAt: iso(Date.now()),
    cursor: 0,
    nextAt: Date.now(),
    snapshot: structuredClone(script),
  });
  auditBot('script.run', 'script', id);
  return result;
}

export function stopBotThread(id: string): MockResult<{ id: string; status: 'done' }> {
  const rec = botState().threads.find((t) => t.id === id);
  if (!rec) return notFound('Không tìm thấy hội thoại');
  if (rec.status === 'done') return conflict('Hội thoại đã hoàn tất');
  rec.status = 'done';
  rec.nextAt = null;
  const log = mockDb().botLog.find((row) => row.id === id);
  if (log) log.status = 'done';
  auditBot('bot_thread.stop', 'bot_thread', id);
  return ok({ id, status: 'done' });
}

export function botActivity() {
  advanceMockBot();
  return { items: botState().activity.slice(0, 40), todayCount: botState().todayCount };
}
