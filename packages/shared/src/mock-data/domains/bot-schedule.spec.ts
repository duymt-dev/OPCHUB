import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockBotSchedule, patchMockBotSchedule } from './bot-schedule';
import { botState } from './bot-state';
import { advanceMockBot, runBotScript } from './bot-execution';
import { advanceMockScriptTurn } from './bot-script-worker';
import { admitAutomaticMockThreads } from './bot-auto-admission';
import { admitMockBotReply } from './bot-reply-admission';
import { advanceMockReplies } from './bot-reply-worker';
import { resetMockDb } from './store';
import { captureBotSnapshot, restoreBotSnapshot } from './community-persistence/bot-snapshot';
import { SCHEDULE_NOW, scriptScheduleFixture } from './tests/bot-schedule-fixture';
import { replyFixture, memberSource, replyThread } from './tests/bot-reply-fixture';

beforeEach(() => {
  resetMockDb();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SCHEDULE_NOW);
});
afterEach(() => vi.useRealTimers());

describe('D-112 mock schedule shares native VN dates and durable pause policy', () => {
  it('defaults live and includes the complete Vietnamese end date', () => {
    expect(mockBotSchedule(SCHEDULE_NOW)).toEqual({
      schedule: { fromDate: null, toDate: null, paused: false },
      state: 'live',
    });
    patchMockBotSchedule({ fromDate: '2026-10-21', toDate: '2026-10-21' });
    expect(mockBotSchedule(Date.parse('2026-10-20T16:59:59.999Z')).state).toBe('waiting');
    expect(mockBotSchedule(Date.parse('2026-10-20T17:00:00Z')).state).toBe('live');
    expect(mockBotSchedule(Date.parse('2026-10-21T16:59:59.999Z')).state).toBe('live');
    expect(mockBotSchedule(Date.parse('2026-10-21T17:00:00Z')).state).toBe('ended');
  });
  it('rejects a reversed merge without modifying persisted state; clear dates does not resume', () => {
    patchMockBotSchedule({ fromDate: '2026-10-21', paused: true });
    const before = mockBotSchedule();
    expect(patchMockBotSchedule({ toDate: '2026-10-20' })).toMatchObject({
      ok: false,
      status: 400,
      fields: [{ path: 'toDate' }],
    });
    expect(mockBotSchedule()).toEqual(before);
    patchMockBotSchedule({ fromDate: null, toDate: null });
    expect(mockBotSchedule().state).toBe('paused');
  });
  it('persists pause/dates across snapshot restore and defaults legacy missing schedule live', () => {
    patchMockBotSchedule({ paused: true, toDate: '2026-10-22' });
    const wire = JSON.parse(JSON.stringify(captureBotSnapshot())) as unknown;
    resetMockDb();
    restoreBotSnapshot(wire);
    expect(mockBotSchedule().schedule).toEqual({
      paused: true,
      fromDate: null,
      toDate: '2026-10-22',
    });
    const { schedule: omitted, ...legacy } = captureBotSnapshot().state;
    expect(omitted.paused).toBe(true);
    restoreBotSnapshot({ ...captureBotSnapshot(), state: legacy });
    expect(mockBotSchedule().state).toBe('live');
  });
  it('fences all script admission/publication paths and resumes the exact retained cursor', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    addScript('pause-resume');
    advanceMockBot(SCHEDULE_NOW);
    const thread = state.threads[0]!;
    expect(thread.cursor).toBe(1);
    const before = structuredClone(thread);
    patchMockBotSchedule({ paused: true });
    expect(runBotScript('pause-resume')).toMatchObject({ ok: false, status: 409 });
    db.botSettings.autoGenerate = true;
    expect(admitAutomaticMockThreads(SCHEDULE_NOW + 60000)).toBe(0);
    advanceMockBot(SCHEDULE_NOW + 60000);
    advanceMockScriptTurn(thread, SCHEDULE_NOW + 60000);
    expect(thread).toEqual(before);
    expect(state.todayCount).toBe(1);
    patchMockBotSchedule({ paused: false });
    advanceMockScriptTurn(thread, SCHEDULE_NOW + 60000);
    expect(thread).toMatchObject({ cursor: 2, status: 'done' });
    expect(state.todayCount).toBe(2);
  });
  it('preserves an admitted reply through pause and fences new reply admissions', () => {
    const { db } = replyFixture();
    db.botSettings.enabled = true;
    db.botSettings.replyToMembers = true;
    const first = memberSource('first');
    expect(admitMockBotReply(first.id, SCHEDULE_NOW)).toBeTruthy();
    const pending = structuredClone(replyThread());
    patchMockBotSchedule({ paused: true });
    expect(admitMockBotReply(memberSource('second').id, SCHEDULE_NOW)).toBeNull();
    advanceMockReplies(SCHEDULE_NOW + 5000);
    expect(replyThread()).toEqual(pending);
    expect(db.botMessageMeta.size).toBe(0);
    patchMockBotSchedule({ paused: false });
    advanceMockReplies(SCHEDULE_NOW + 5000);
    expect(db.botMessageMeta.size).toBe(1);
  });
  it('fails closed on corrupted persisted schedules', () => {
    botState().schedule = { paused: false, fromDate: 'bad', toDate: null };
    expect(mockBotSchedule().state).toBe('paused');
  });
});
