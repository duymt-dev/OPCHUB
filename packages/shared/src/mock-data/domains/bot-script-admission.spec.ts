import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { admitDueMockScripts } from './bot-script-admission';
import { runBotScript } from './bot-execution';
import { emergencyStopMockBot } from './bot-emergency';
import { SCHEDULE_NOW, scriptScheduleFixture } from './tests/bot-schedule-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SCHEDULE_NOW);
});
afterEach(() => vi.useRealTimers());

describe('TIP-V2-501 UAT-15 D-50 scheduled/manual admission boundaries', () => {
  it('due candidates use runAt then id ordering, never consume the 31st schedule under active capacity', () => {
    const { state, addScript } = scriptScheduleFixture();
    const ids = Array.from({ length: 31 }, (_, i) => `ordered-${String(i).padStart(2, '0')}`);
    for (const id of [...ids].reverse()) addScript(id);
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(30);
    expect(state.threads.map((row) => row.scriptId).reverse()).toEqual(ids.slice(0, 30));
    expect(state.scriptLastRunAt.has('ordered-30')).toBe(false);
    expect(admitDueMockScripts(SCHEDULE_NOW + 1000)).toBe(0);
    const oldest = state.threads.at(-1);
    if (!oldest) throw new Error('Missing admitted thread');
    oldest.status = 'done';
    oldest.nextAt = null;
    expect(admitDueMockScripts(SCHEDULE_NOW + 2000)).toBe(1);
    expect(state.threads).toHaveLength(30);
    expect(state.threads.some((row) => row.id === oldest.id)).toBe(false);
    expect(state.scriptLastRunAt.get('ordered-30')).toBe(SCHEDULE_NOW + 2000);
    expect(state.scriptLastRunAt.get('ordered-00')).toBe(SCHEDULE_NOW);
    for (const row of state.threads) row.status = 'done';
    expect(admitDueMockScripts(SCHEDULE_NOW + 3000)).toBe(0);
  });

  it('earlier runAt outranks lexical id, but an active script does not hide another candidate', () => {
    const { state, addScript } = scriptScheduleFixture();
    addScript('a-later');
    addScript('z-earlier', { runAt: new Date(SCHEDULE_NOW - 2000).toISOString() });
    addScript('active');
    runBotScript('active');
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(2);
    expect(state.threads.map((row) => row.scriptId)).toEqual(['a-later', 'z-earlier', 'active']);
    expect(state.scriptLastRunAt.has('active')).toBe(false);
  });

  it('manual admission works while global/feature paused, dedupes, timestamps now and audits each command', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('paused-manual');
    db.botSettings.enabled = false;
    state.featureEnabled = false;
    const first = runBotScript('paused-manual');
    const second = runBotScript('paused-manual');
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(state.threads).toHaveLength(1);
    expect(db.botLog).toHaveLength(1);
    expect(db.botLog[0]?.createdAt).toBe(new Date(SCHEDULE_NOW).toISOString());
    expect(state.scriptLastRunAt.size).toBe(0);
    expect(state.audit.map((row) => row.action)).toEqual(['script.run', 'script.run']);
  });

  it('manual unknown/disabled/full admission fails without creating logs or audits', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('disabled', { enabled: false });
    expect(runBotScript('missing')).toMatchObject({ ok: false, status: 404 });
    expect(runBotScript('disabled')).toMatchObject({ ok: false, status: 409 });
    expect(state.audit).toEqual([]);
    for (let i = 0; i < 30; i++) {
      addScript(`full-${i}`);
      expect(runBotScript(`full-${i}`).ok).toBe(true);
    }
    addScript('overflow');
    expect(runBotScript('overflow')).toMatchObject({ ok: false, status: 409 });
    expect(state.threads).toHaveLength(30);
    expect(state.audit).toHaveLength(30);
    expect(db.botLog).toHaveLength(30);
  });

  it('emergency terminal threads do not resurrect their already consumed schedule on re-enable', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('stopped');
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(1);
    emergencyStopMockBot('admin');
    db.botSettings.enabled = true;
    expect(admitDueMockScripts(SCHEDULE_NOW + 1000)).toBe(0);
    expect(state.threads).toHaveLength(1);
    expect(state.threads[0]?.status).toBe('done');
    expect(state.scriptLastRunAt.get('stopped')).toBe(SCHEDULE_NOW);
  });

  it('a fresh MockDb has no prior admission checkpoint', () => {
    const first = scriptScheduleFixture();
    first.addScript('reset');
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(1);
    const fresh = scriptScheduleFixture();
    fresh.addScript('reset');
    expect(fresh.state.scriptLastRunAt.size).toBe(0);
    expect(admitDueMockScripts(SCHEDULE_NOW)).toBe(1);
  });
});
