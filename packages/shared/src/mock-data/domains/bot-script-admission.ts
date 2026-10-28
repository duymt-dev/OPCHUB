import type { BotScript, BotThread } from '../../api-domains';
import { isBotScriptDue } from '../../bot/runtime-time';
import { reserveMockBotThread } from './bot-retention';
import { botState } from './bot-state';
import { mockDb, nextId } from './store';
import { conflict, iso, ok, type MockResult } from './util';
import { mockBotScheduleAllows } from './bot-schedule';

/** Single synchronous mock admission transaction, shared by manual and tick paths. */
export function admitMockScript(
  script: BotScript,
  now: number,
): MockResult<{ threadId: string; status: BotThread['status'] }> {
  if (!mockBotScheduleAllows(now)) return conflict('Bot đang tạm dừng hoặc ngoài lịch chạy');
  const db = mockDb();
  const state = botState();
  const existing = state.threads.find((row) => row.scriptId === script.id && row.status !== 'done');
  if (existing) return ok({ threadId: existing.id, status: existing.status });
  if (!reserveMockBotThread()) return conflict('Đã đạt giới hạn 30 hội thoại đang hoạt động');
  const id = nextId('th');
  const createdAt = iso(now);
  state.threads.unshift({
    id,
    scriptId: script.id,
    kind: 'script',
    status: 'scheduled',
    createdAt,
    cursor: 0,
    nextAt: now,
    snapshot: structuredClone(script),
  });
  db.botLog.unshift({
    id,
    scriptId: script.id,
    topic: script.topic,
    groupNames: script.groupIds.map(
      (group) => db.groups.find((row) => row.id === group)?.name ?? group,
    ),
    status: 'scheduled',
    createdAt,
  });
  return ok({ threadId: id, status: 'scheduled' });
}

/** Native-compatible due ordering and lastRunAt checkpoint, independent of thread retention. */
export function admitDueMockScripts(now: number): number {
  const db = mockDb();
  const state = botState();
  if (!state.featureEnabled || !db.botSettings.enabled || !mockBotScheduleAllows(now)) return 0;
  const candidates = db.scripts
    .filter((script) => {
      const last = state.scriptLastRunAt.get(script.id);
      return (
        script.enabled &&
        isBotScriptDue(
          script.runAt ? new Date(script.runAt) : null,
          last === undefined ? null : new Date(last),
          new Date(now),
        ) &&
        !state.threads.some((row) => row.scriptId === script.id && row.status !== 'done')
      );
    })
    .sort(
      (a, b) => Date.parse(a.runAt ?? '') - Date.parse(b.runAt ?? '') || a.id.localeCompare(b.id),
    )
    .slice(0, 30);
  let count = 0;
  for (const script of candidates) {
    const result = admitMockScript(script, now);
    if (!result.ok) break;
    state.scriptLastRunAt.set(script.id, now);
    count += 1;
  }
  return count;
}
