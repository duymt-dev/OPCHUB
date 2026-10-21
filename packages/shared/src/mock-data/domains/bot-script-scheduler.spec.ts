import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMockBot, runBotScript } from './bot-execution';
import { SCHEDULE_NOW, scriptScheduleFixture } from './tests/bot-schedule-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SCHEDULE_NOW);
});
afterEach(() => vi.useRealTimers());

describe('TIP-V2-501 UAT-15 LK-11 MSW scheduled script admission', () => {
  it('a due script posts its first real turn without manual run or Admin audit; replay is one-shot', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('due');
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads).toHaveLength(1);
    expect(state.threads[0]).toMatchObject({ scriptId: 'due', cursor: 1, status: 'running' });
    expect(db.botLog[0]?.createdAt).toBe(new Date(SCHEDULE_NOW).toISOString());
    expect(state.audit).toEqual([]);
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads[0]?.cursor).toBe(1);
    advanceMockBot(SCHEDULE_NOW + 30000);
    expect(state.threads[0]?.status).toBe('done');
    advanceMockBot(SCHEDULE_NOW + 60000);
    expect(state.threads).toHaveLength(1);
    expect(state.todayCount).toBe(2);
  });

  it('null/future/disabled schedules remain idle; arrival at the exact deadline admits only future', () => {
    const { state, addScript } = scriptScheduleFixture();
    addScript('manual', { runAt: null });
    addScript('future', { runAt: new Date(SCHEDULE_NOW + 1000).toISOString() });
    addScript('disabled', { enabled: false });
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads).toEqual([]);
    advanceMockBot(SCHEDULE_NOW + 1000);
    expect(state.threads.map((row) => row.scriptId)).toEqual(['future']);
  });

  it.each(['feature', 'global'] as const)(
    '%s pause neither admits nor consumes a due schedule',
    (flag) => {
      const { db, state, addScript } = scriptScheduleFixture();
      addScript('paused');
      if (flag === 'feature') state.featureEnabled = false;
      else db.botSettings.enabled = false;
      advanceMockBot(SCHEDULE_NOW);
      expect(state.threads).toEqual([]);
      state.featureEnabled = true;
      db.botSettings.enabled = true;
      advanceMockBot(SCHEDULE_NOW + 1000);
      expect(state.threads).toHaveLength(1);
    },
  );

  it('manual work suppresses concurrent scheduled admission but does not consume lastRunAt', () => {
    const { state, addScript } = scriptScheduleFixture();
    addScript('manual-first');
    const run = runBotScript('manual-first');
    expect(run.ok).toBe(true);
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads).toHaveLength(1);
    advanceMockBot(SCHEDULE_NOW + 30000);
    expect(state.threads[0]?.status).toBe('done');
    advanceMockBot(SCHEDULE_NOW + 60000);
    expect(state.threads).toHaveLength(2);
    expect(state.audit).toHaveLength(1);
  });

  it('schedule rearm requires a runAt later than the last admission; line/group snapshots remain immutable', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    const script = addScript('rearm');
    advanceMockBot(SCHEDULE_NOW);
    const first = script.lines[0];
    if (!first) throw new Error('Missing opening');
    script.lines[1] = { ...first, body: 'Edited after admission' };
    script.groupIds = ['c2'];
    advanceMockBot(SCHEDULE_NOW + 30000);
    expect([...db.messages.values()].flat().some((row) => row.body === 'Closing rearm')).toBe(true);
    expect(
      [...db.messages.values()].flat().some((row) => row.body === 'Edited after admission'),
    ).toBe(false);
    advanceMockBot(SCHEDULE_NOW + 60000);
    expect(state.threads).toHaveLength(1);
    script.runAt = new Date(SCHEDULE_NOW + 90000).toISOString();
    advanceMockBot(SCHEDULE_NOW + 89999);
    expect(state.threads).toHaveLength(1);
    advanceMockBot(SCHEDULE_NOW + 90000);
    expect(state.threads).toHaveLength(2);
  });

  it('manual pending work uses live script spacing, not the old snapshotted delay', () => {
    const { state, addScript } = scriptScheduleFixture();
    const script = addScript('spacing', { runAt: null });
    runBotScript(script.id);
    script.delayMinutes = 2;
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads[0]?.nextAt).toBe(SCHEDULE_NOW + 120000);
  });
});
