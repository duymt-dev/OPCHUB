import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMockBot, botActivity, runBotScript } from './bot-execution';
import { scriptScheduleFixture, SCHEDULE_NOW } from './tests/bot-schedule-fixture';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SCHEDULE_NOW);
});
afterEach(() => vi.useRealTimers());

describe('TIP-V2-501 REQ-208 MSW script posting limits', () => {
  it.each(['group', 'default-room'] as const)(
    'never posts to a removed %s or invents a general room',
    (removed) => {
      const { db, state, addScript } = scriptScheduleFixture();
      const script = addScript('missing-destination');
      expect(runBotScript(script.id).ok).toBe(true);
      if (removed === 'group') db.groups = db.groups.filter((row) => row.id !== 'c1');
      else db.rooms = db.rooms.filter((row) => !(row.groupId === 'c1' && row.isDefault));
      advanceMockBot(SCHEDULE_NOW);
      expect(
        [...db.messages.values()].flat().some((row) => row.body === script.lines[0]?.body),
      ).toBe(false);
      expect(state.todayCount).toBe(0);
      expect(state.threads[0]?.cursor).toBe(1);
    },
  );

  it('uses the real default room ID instead of a synthetic group-general identifier', () => {
    const { db, addScript } = scriptScheduleFixture();
    const room = db.rooms.find((row) => row.groupId === 'c1' && row.isDefault);
    if (!room) throw new Error('Missing default room');
    room.id = 'actual-default-room';
    addScript('real-room');
    advanceMockBot(SCHEDULE_NOW);
    expect(
      db.messages.get('actual-default-room')?.some((row) => row.body === 'Opening real-room'),
    ).toBe(true);
  });

  it('rebuilds daily quota from persisted hidden bot messages after the counter cache is lost', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    const persona = db.personas[0];
    if (!persona) throw new Error('Missing persona');
    persona.postsPerDay = 1;
    writeThreadMessage('already-posted', 'prior-thread', 0, {
      personaId: persona.id,
      createdAt: new Date(SCHEDULE_NOW - 1000).toISOString(),
      hiddenAt: new Date(SCHEDULE_NOW).toISOString(),
    });
    state.daily.clear();
    addScript('quota');
    advanceMockBot(SCHEDULE_NOW);
    expect([...db.messages.values()].flat().some((row) => row.body === 'Opening quota')).toBe(
      false,
    );
    expect(state.todayCount).toBe(0);
    expect(state.threads[0]?.cursor).toBe(1);
  });

  it('a saturated group defers the whole multi-group turn without cursor/quota/activity writes, then retries once', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    const persona = db.personas[0];
    if (!persona) throw new Error('Missing persona');
    persona.groupIds = ['c1', 'c2'];
    addScript('burst', { groupIds: ['c1', 'c2'] });
    expect(runBotScript('burst').ok).toBe(true);
    state.groupRate.set('c2', Array<number>(30).fill(SCHEDULE_NOW));
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads[0]).toMatchObject({
      status: 'scheduled',
      cursor: 0,
      nextAt: SCHEDULE_NOW,
    });
    expect(state.todayCount).toBe(0);
    expect(state.daily.size).toBe(0);
    expect(state.activity).toEqual([]);
    expect([...db.messages.values()].flat().some((row) => row.body === 'Opening burst')).toBe(
      false,
    );
    advanceMockBot(SCHEDULE_NOW + 60000);
    advanceMockBot(SCHEDULE_NOW + 60000);
    expect(state.threads[0]?.cursor).toBe(1);
    expect(state.todayCount).toBe(2);
  });

  it('todayCount resets at Vietnamese midnight even while globally paused; all-time persona postCount does not', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    const persona = db.personas[0];
    if (!persona) throw new Error('Missing persona');
    persona.postsPerDay = 1;
    const before = Date.parse('2026-10-21T16:59:59Z');
    vi.setSystemTime(before);
    addScript('midnight', {
      runAt: null,
      lines: [{ personaId: persona.id, body: 'Before midnight' }],
    });
    const allTime = persona.postCount;
    runBotScript('midnight');
    advanceMockBot(before);
    expect(botActivity().todayCount).toBe(1);
    db.botSettings.enabled = false;
    vi.setSystemTime(before + 2000);
    expect(botActivity().todayCount).toBe(0);
    expect(state.todayCount).toBe(0);
    expect(persona.postCount).toBe(allTime + 1);
    db.botSettings.enabled = true;
    runBotScript('midnight');
    advanceMockBot(before + 2000);
    expect(botActivity().todayCount).toBe(1);
    expect(persona.postCount).toBe(allTime + 2);
  });
});
