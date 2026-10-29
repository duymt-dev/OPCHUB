import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { admitDueMockScripts } from './bot-script-rotation';
import { advanceMockBot } from './bot-execution';
import { botState } from './bot-state';
import { resetMockDb } from './store';
import { patchMockBotSchedule } from './bot-schedule';
import { captureBotSnapshot, restoreBotSnapshot } from './community-persistence/bot-snapshot';
import { SCHEDULE_NOW, scriptScheduleFixture } from './tests/bot-schedule-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SCHEDULE_NOW);
});
afterEach(() => vi.useRealTimers());
function finish() {
  for (const row of botState().threads) {
    row.status = 'done';
    row.nextAt = null;
  }
}

describe('D-112 REQ-607 persisted free-group script rotation', () => {
  it('rotates null/past scripts in ID order per group, wrapping independently of retained history', () => {
    const { state, addScript } = scriptScheduleFixture();
    addScript('b', { runAt: null });
    addScript('a');
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(1);
    expect(state.threads[0]).toMatchObject({ scriptId: 'a', snapshot: { groupIds: ['c1'] } });
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(0);
    finish();
    expect(admitDueMockScripts(SCHEDULE_NOW + 1)).toBe(1);
    expect(state.threads[0]?.scriptId).toBe('b');
    state.threads = []; // Terminal display history may be pruned; cursor must survive.
    expect(admitDueMockScripts(SCHEDULE_NOW + 2)).toBe(1);
    expect(state.threads[0]?.scriptId).toBe('a');
    expect(state.rotation.get('c1')).toEqual({ lastScriptId: 'a', updatedAt: SCHEDULE_NOW + 2 });
    expect(state.audit).toEqual([]);
  });

  it('the same script starts independent group-local executions instead of one multi-group rotation', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('shared', { groupIds: ['c1', 'c2'] });
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(2);
    expect(state.threads.map((r) => r.snapshot.groupIds)).toEqual([['c2'], ['c1']]);
    expect(new Set(state.threads.map((r) => r.id)).size).toBe(2);
    expect(db.botLog.map((r) => r.groupNames.length)).toEqual([1, 1]);
    state.threads[1]!.status = 'done';
    state.threads[1]!.nextAt = null;
    expect(admitDueMockScripts(SCHEDULE_NOW + 1)).toBe(1);
    expect(state.threads[0]?.snapshot.groupIds).toEqual(['c1']);
    expect(state.threads.filter((r) => r.status !== 'done')).toHaveLength(2);
  });

  it('future/disabled/missing-room scripts cannot consume a cursor and exact future boundary is included', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('future', { runAt: new Date(SCHEDULE_NOW + 1000).toISOString() });
    addScript('disabled', { enabled: false });
    addScript('no-room', { groupIds: ['c2'] });
    db.rooms = db.rooms.filter((r) => r.groupId !== 'c2');
    expect(admitDueMockScripts(SCHEDULE_NOW + 999)).toBe(0);
    expect(state.rotation.size).toBe(0);
    expect(admitDueMockScripts(SCHEDULE_NOW + 1000)).toBe(1);
    expect(state.threads[0]?.scriptId).toBe('future');
  });

  it('pause/window fences keep the cursor unchanged; removing a previously selected script does not reset ordering', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('a');
    addScript('b');
    addScript('c');
    admitDueMockScripts(SCHEDULE_NOW);
    finish();
    const saved = structuredClone(state.rotation);
    patchMockBotSchedule({ paused: true });
    expect(admitDueMockScripts(SCHEDULE_NOW + 1)).toBe(0);
    expect(state.rotation).toEqual(saved);
    patchMockBotSchedule({ paused: false, fromDate: '2099-01-01' });
    expect(admitDueMockScripts(SCHEDULE_NOW + 2)).toBe(0);
    expect(state.rotation).toEqual(saved);
    patchMockBotSchedule({ fromDate: null });
    db.scripts = db.scripts.filter((s) => s.id !== 'a');
    expect(admitDueMockScripts(SCHEDULE_NOW + 3)).toBe(1);
    expect(state.threads[0]?.scriptId).toBe('b');
  });

  it('snapshot round trip retains cursor and defaults old snapshots; corrupt input is atomic', () => {
    const { addScript } = scriptScheduleFixture();
    addScript('a');
    addScript('b');
    admitDueMockScripts(SCHEDULE_NOW);
    finish();
    const wire: unknown = JSON.parse(JSON.stringify(captureBotSnapshot()));
    resetMockDb();
    restoreBotSnapshot(wire);
    expect(admitDueMockScripts(SCHEDULE_NOW + 1)).toBe(1);
    expect(botState().threads[0]?.scriptId).toBe('b');
    const snapshot = captureBotSnapshot();
    expect(() =>
      restoreBotSnapshot({
        ...snapshot,
        state: { ...snapshot.state, rotation: [['c1', { lastScriptId: '', updatedAt: 1 }]] },
      }),
    ).toThrow();
    expect(captureBotSnapshot()).toEqual(snapshot);
    const { rotation, ...legacy } = snapshot.state;
    expect(rotation).toHaveLength(1);
    restoreBotSnapshot({ ...snapshot, state: legacy });
    expect(botState().rotation.size).toBe(0);
  });

  it('scheduler alternates stored and eligible generated work, then resumes the stored cursor', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('a');
    addScript('b');
    for (const p of db.personas) {
      p.enabled = true;
      p.groupIds = ['c1'];
      p.activeHours = 'Cả ngày';
      p.postsPerDay = 1000;
    }
    db.botSettings.autoGenerate = true;
    db.botSettings.topics = ['First topic', 'Second topic'];
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads).toHaveLength(1);
    expect(state.threads[0]).toMatchObject({ kind: 'script', scriptId: 'a', cursor: 1 });
    finish();
    advanceMockBot(SCHEDULE_NOW + 1000);
    expect(state.threads[0]).toMatchObject({ kind: 'auto', cursor: 1 });
    expect(state.rotation.get('c1')?.lastScriptId).toBe('a');
    finish();
    advanceMockBot(SCHEDULE_NOW + 2000);
    expect(state.threads[0]).toMatchObject({ kind: 'script', scriptId: 'b', cursor: 1 });
  });

  it('ineligible optional AI never starves stored scripts after a completed stored run', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('a');
    addScript('b');
    db.botSettings.autoGenerate = true;
    db.botSettings.topics = [];
    advanceMockBot(SCHEDULE_NOW);
    finish();
    advanceMockBot(SCHEDULE_NOW + 1000);
    expect(state.threads[0]).toMatchObject({ kind: 'script', scriptId: 'b' });
    expect(state.threads.some((r) => r.kind === 'auto')).toBe(false);
  });
});
