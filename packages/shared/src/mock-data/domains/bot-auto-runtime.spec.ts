import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMockBot, stopBotThread } from './bot-execution';
import { mockPersonaDayKey } from './bot-posting-limits';
import { AUTO_NOW, autoFixture } from './tests/bot-auto-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AUTO_NOW);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('REQ-208 P5-PLAN-01 automatic mock conversations', () => {
  it.each([2, 3])(
    '%i eligible personas create opener-closes 3/4-turn work without a script',
    (n) => {
      const { state, db } = autoFixture(n);
      advanceMockBot(AUTO_NOW);
      expect(state.threads).toHaveLength(1);
      const thread = state.threads[0];
      expect(thread).toMatchObject({
        scriptId: null,
        kind: 'auto',
        status: 'running',
        cursor: 1,
        snapshot: { topic: 'First topic', groupIds: ['c1'] },
        nextAt: AUTO_NOW + 60000,
      });
      const lines = thread?.snapshot.lines ?? [];
      expect(lines).toHaveLength(n + 1);
      expect(lines[0]?.personaId).toBe(lines.at(-1)?.personaId);
      expect(new Set(lines.slice(0, -1).map((line) => line.personaId)).size).toBe(n);
      expect(lines[0]?.body).toBe('Mình chia sẻ thêm về chủ đề: First topic');
      expect(lines.slice(1).every((line) => line.body === '')).toBe(true);
      expect(db.botLog[0]).toMatchObject({ id: thread?.id, status: 'running' });
      expect(state.audit).toEqual([]);
    },
  );

  it('tick replay neither admits duplicate work nor publishes before the next real deadline', () => {
    const { db, state } = autoFixture();
    advanceMockBot(AUTO_NOW);
    advanceMockBot(AUTO_NOW);
    advanceMockBot(AUTO_NOW + 59999);
    expect(state.threads).toHaveLength(1);
    expect(state.todayCount).toBe(1);
    advanceMockBot(AUTO_NOW + 60000);
    expect(state.threads[0]?.cursor).toBe(2);
    expect(db.botMessageMeta.size).toBe(2);
    expect([...db.botMessageMeta.values()].map((meta) => meta.kind)).toEqual(['auto', 'auto']);
    expect([...db.botMessageMeta.values()].map((meta) => meta.opening)).toEqual([true, false]);
  });

  it('completes all turns then rotates topic only on the next admission tick', () => {
    const { state } = autoFixture(2);
    advanceMockBot(AUTO_NOW);
    advanceMockBot(AUTO_NOW + 60000);
    advanceMockBot(AUTO_NOW + 120000);
    expect(state.threads[0]).toMatchObject({ status: 'done', cursor: 3, nextAt: null });
    expect(state.threads).toHaveLength(1);
    advanceMockBot(AUTO_NOW + 120001);
    expect(state.threads).toHaveLength(2);
    expect(state.threads[0]?.snapshot.topic).toBe('Second topic');
  });

  it('live delay and stop apply to automatic work; disabling admission does not cancel existing work', () => {
    const { db, state } = autoFixture();
    advanceMockBot(AUTO_NOW);
    const thread = state.threads[0];
    if (!thread) throw new Error('Automatic thread missing');
    db.botSettings.autoGenerate = false;
    db.botSettings.delayMinutes = 2;
    advanceMockBot(AUTO_NOW + 60000);
    expect(thread).toMatchObject({ cursor: 2, nextAt: AUTO_NOW + 180000 });
    expect(stopBotThread(thread.id).ok).toBe(true);
    advanceMockBot(AUTO_NOW + 300000);
    expect(thread).toMatchObject({ status: 'done', cursor: 2, nextAt: null });
    expect(state.threads).toHaveLength(1);
  });

  it.each(['global', 'feature', 'auto', 'topics', 'personas', 'quota', 'hours', 'room'] as const)(
    '%s gate prevents admission without consuming a turn',
    (gate) => {
      const { db, state } = autoFixture(2);
      if (gate === 'global') db.botSettings.enabled = false;
      if (gate === 'feature') state.featureEnabled = false;
      if (gate === 'auto') db.botSettings.autoGenerate = false;
      if (gate === 'topics') db.botSettings.topics = ['  '];
      if (gate === 'personas' && db.personas[0]) db.personas[0].enabled = false;
      if (gate === 'quota')
        for (const p of db.personas) state.daily.set(mockPersonaDayKey(p.id, AUTO_NOW), 19);
      if (gate === 'hours') for (const p of db.personas) p.activeHours = '01:00 - 02:00';
      if (gate === 'room') db.rooms = db.rooms.filter((room) => room.groupId !== 'c1');
      advanceMockBot(AUTO_NOW);
      expect(state.threads).toEqual([]);
      expect(state.todayCount).toBe(0);
    },
  );
});
