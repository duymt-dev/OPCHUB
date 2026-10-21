import type { BotThread } from '../../api-domains';
import { mockDb } from './store';
import { conflict, iso, notFound, ok, type MockResult } from './util';
import { admitDueMockScripts, admitMockScript } from './bot-script-admission';
import { admitAutomaticMockThreads } from './bot-auto-admission';
import { botState } from './bot-state';
import type { BotAuditRow, ThreadRec } from './bot-state-types';
export { botState } from './bot-state';
export type { BotAuditRow } from './bot-state-types';
import { advanceMockReplies } from './bot-reply-worker';
import { advanceMockScriptTurn } from './bot-script-worker';
import { mockBotTodayCount } from './bot-activity';

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
  mockBotTodayCount(now);
  if (!db.botSettings.enabled || !state.featureEnabled) return;
  admitDueMockScripts(now);
  admitAutomaticMockThreads(now);
  for (const rec of state.threads) {
    if (rec.kind === 'reply') continue;
    if (rec.status === 'done' || rec.nextAt === null || rec.nextAt > now) continue;
    advanceMockScriptTurn(rec, now);
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
  actorId?: string,
): MockResult<{ threadId: string; status: BotThread['status'] }> {
  const script = mockDb().scripts.find((s) => s.id === id);
  if (!script) return notFound('Không tìm thấy kịch bản');
  if (!script.enabled) return conflict('Kịch bản đang tắt');
  const result = admitMockScript(script, Date.now());
  if (!result.ok) return result;
  auditBot('script.run', 'script', id, actorId);
  return result;
}

export function stopBotThread(
  id: string,
  actorId?: string,
): MockResult<{ id: string; status: 'done' }> {
  const rec = botState().threads.find((t) => t.id === id);
  if (!rec) return notFound('Không tìm thấy hội thoại');
  if (rec.status === 'done') return conflict('Hội thoại đã hoàn tất');
  rec.status = 'done';
  rec.nextAt = null;
  const log = mockDb().botLog.find((row) => row.id === id);
  if (log) log.status = 'done';
  auditBot('bot_thread.stop', 'bot_thread', id, actorId);
  return ok({ id, status: 'done' });
}

export function botActivity() {
  advanceMockBot();
  return { items: botState().activity.slice(0, 40), todayCount: botState().todayCount };
}
