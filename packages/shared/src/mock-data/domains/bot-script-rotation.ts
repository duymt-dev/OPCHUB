import { isBotScriptDue } from '../../bot/runtime-time';
import { admitMockScript } from './bot-script-admission';
import { mockBotScheduleAllows } from './bot-schedule';
import { botState } from './bot-state';
import { mockDb } from './store';

/** Mirrors native rotation: free groups, persisted cursor, future-only date fence. */
export function admitDueMockScripts(now: number): number {
  const db = mockDb();
  const state = botState();
  if (!state.featureEnabled || !db.botSettings.enabled || !mockBotScheduleAllows(now)) return 0;
  const occupied = new Set(
    state.threads.filter((r) => r.status !== 'done').flatMap((r) => r.snapshot.groupIds),
  );
  const rooms = new Set(db.rooms.filter((r) => r.isDefault).map((r) => r.groupId));
  const scripts = db.scripts
    .filter((s) => s.enabled && isBotScriptDue(s.runAt ? new Date(s.runAt) : null, new Date(now)))
    .sort((a, b) => a.id.localeCompare(b.id));
  const groups = db.groups
    .filter((g) => rooms.has(g.id) && !occupied.has(g.id))
    .sort(
      (a, b) =>
        (state.rotation.get(a.id)?.updatedAt ?? -Infinity) -
          (state.rotation.get(b.id)?.updatedAt ?? -Infinity) || a.id.localeCompare(b.id),
    );
  let count = 0;
  for (const group of groups) {
    const pool = scripts.filter((s) => s.groupIds.includes(group.id));
    const cursor = state.rotation.get(group.id)?.lastScriptId ?? '';
    const script = pool.find((s) => s.id > cursor) ?? pool[0];
    if (!script) continue;
    const result = admitMockScript(script, now, group.id);
    if (!result.ok) break;
    state.rotation.set(group.id, { lastScriptId: script.id, updatedAt: now });
    state.scriptLastRunAt.set(script.id, now);
    count++;
  }
  return count;
}
