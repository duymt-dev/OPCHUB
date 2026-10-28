import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { admitMockBotReply } from './bot-reply-admission';
import { advanceMockBot, botActivity, runBotScript } from './bot-execution';
import { recordMockBotMessage } from './bot-message-store';
import { mockPersonaDailyCount } from './bot-posting-limits';
import { scriptScheduleFixture, SCHEDULE_NOW } from './tests/bot-schedule-fixture';
import { memberSource, replyFixture } from './tests/bot-reply-fixture';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(SCHEDULE_NOW);
});
afterEach(() => vi.useRealTimers());

describe('TIP-V2-515 REQ-208 shared posting quota and activity persistence', () => {
  it('quota survives120-row display pruning and counter-cache loss; pruned IDs cannot be reused', () => {
    const { db, state } = scriptScheduleFixture();
    const persona = db.personas[0];
    if (!persona) throw new Error('Missing persona');
    const first = writeThreadMessage('persisted-0', 'persisted-0', 0, {
      personaId: persona.id,
      createdAt: new Date(SCHEDULE_NOW).toISOString(),
    });
    for (let i = 1; i < 121; i++)
      writeThreadMessage(`persisted-${i}`, `persisted-${i}`, 0, {
        personaId: persona.id,
        createdAt: new Date(SCHEDULE_NOW + i).toISOString(),
      });
    state.daily.clear();
    expect(db.messages.get('c1-general')?.filter((row) => row.isSimulated)).toHaveLength(120);
    expect(db.messages.get('c1-general')?.some((row) => row.id === first.id)).toBe(false);
    expect(mockPersonaDailyCount(persona.id, SCHEDULE_NOW + 1000)).toBe(121);
    expect(
      recordMockBotMessage(db, first, {
        threadId: 'different-execution',
        kind: 'script',
        turn: 0,
        personaId: persona.id,
      }),
    ).toBe(false);
    expect(mockPersonaDailyCount(persona.id, SCHEDULE_NOW + 1000)).toBe(121);
  });

  it('the whole multi-room turn skips if all destination messages cannot fit daily quota', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    const persona = db.personas[0];
    if (!persona) throw new Error('Missing persona');
    persona.groupIds = ['c1', 'c2'];
    persona.postsPerDay = 1;
    addScript('atomic-quota', { groupIds: ['c1', 'c2'] });
    expect(runBotScript('atomic-quota').ok).toBe(true);
    advanceMockBot(SCHEDULE_NOW);
    expect(state.todayCount).toBe(0);
    expect(state.threads[0]?.cursor).toBe(1);
    expect(
      [...db.messages.values()].flat().some((row) => row.body === 'Opening atomic-quota'),
    ).toBe(false);
    expect(state.activity[0]?.text).toContain('đã đạt tần suất ngày');
  });

  it('script burst gate includes reply/auto publications after group-rate cache loss', () => {
    const { state, addScript } = scriptScheduleFixture();
    for (let i = 0; i < 30; i++)
      writeThreadMessage(`mixed-${i}`, `mixed-${i}`, 0, {
        kind: i % 2 ? 'reply' : 'auto',
        createdAt: new Date(SCHEDULE_NOW - 1).toISOString(),
      });
    state.groupRate.clear();
    addScript('mixed-burst');
    advanceMockBot(SCHEDULE_NOW);
    expect(state.threads[0]).toMatchObject({ cursor: 0, status: 'scheduled' });
    expect(state.activity).toEqual([]);
    expect(state.todayCount).toBe(0);
  });

  it.each(['hours', 'disabled', 'unassigned'] as const)(
    'a %s persona skips exactly one turn with native diagnostic and no count',
    (condition) => {
      const { db, state, addScript } = scriptScheduleFixture();
      const persona = db.personas[0];
      if (!persona) throw new Error('Missing persona');
      addScript('skip');
      if (condition === 'hours') persona.activeHours = '01:00 - 02:00';
      if (condition === 'disabled') persona.enabled = false;
      if (condition === 'unassigned') persona.groupIds = [];
      advanceMockBot(SCHEDULE_NOW);
      advanceMockBot(SCHEDULE_NOW);
      expect(state.threads[0]?.cursor).toBe(1);
      expect(state.activity).toHaveLength(1);
      expect(state.activity[0]?.text).toContain('Bỏ lượt 1: Persona');
      expect(state.todayCount).toBe(0);
      expect(state.groupRate.size).toBe(0);
    },
  );

  it('reply activity posted across midnight belongs only to the publication day', () => {
    const before = Date.parse('2026-10-21T16:59:58Z');
    vi.setSystemTime(before);
    const { db, state } = replyFixture();
    expect(admitMockBotReply(memberSource().id, before)).not.toBeNull();
    advanceMockBot(before + 4999);
    expect(state.todayCount).toBe(0);
    vi.setSystemTime(before + 5000);
    advanceMockBot(before + 5000);
    expect(botActivity().todayCount).toBe(1);
    expect(botActivity().items[0]?.text).toContain('Đã đăng lượt 1/1');
    db.botSettings.enabled = false;
    vi.setSystemTime(before + 86405000);
    expect(botActivity().todayCount).toBe(0);
    expect(botActivity().items).toHaveLength(1);
  });

  it('activity count retains all successful messages after120 visible rows are pruned', () => {
    const { db, state, addScript } = scriptScheduleFixture();
    const persona = db.personas[0];
    if (!persona) throw new Error('Missing persona');
    addScript('retained-count', {
      lines: Array.from({ length: 121 }, (_, i) => ({
        personaId: persona.id,
        body: `Retained count ${i}`,
      })),
    });
    for (let i = 0; i < 121; i++) advanceMockBot(SCHEDULE_NOW + i * 60000);
    expect(state.threads[0]?.status).toBe('done');
    expect(state.todayCount).toBe(121);
    expect(botActivity(false).items).toHaveLength(40);
    expect(botActivity(false).todayCount).toBe(121);
    expect(
      db.messages.get('c1-general')?.filter((row) => row.body.startsWith('Retained count')),
    ).toHaveLength(120);
    expect(state.audit).toEqual([]);
  });
});
