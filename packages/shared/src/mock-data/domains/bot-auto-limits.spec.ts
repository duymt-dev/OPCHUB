import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMockBot } from './bot-execution';
import { mockPersonaDayKey } from './bot-posting-limits';
import { drainMockKeywordHits } from './moderation-jobs';
import { listKeywords } from './group-admin';
import { emergencyStopMockBot } from './bot-emergency';
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

describe('REQ-208 automatic publication rechecks and shared NA-07 path', () => {
  it('emergency stop fences existing work; resume may admit new auto work but never restarts stopped cursors', () => {
    const { db, state } = autoFixture(2);
    advanceMockBot(AUTO_NOW);
    const original = state.threads[0];
    if (!original) throw new Error('Missing original automatic work');
    emergencyStopMockBot('admin');
    expect(original).toMatchObject({ status: 'done', cursor: 1, nextAt: null });
    advanceMockBot(AUTO_NOW + 60000);
    expect(state.threads).toHaveLength(1);
    db.botSettings.enabled = true;
    advanceMockBot(AUTO_NOW + 60000);
    expect(state.threads).toHaveLength(2);
    expect(original).toMatchObject({ status: 'done', cursor: 1, nextAt: null });
    expect(state.threads[0]?.id).not.toBe(original.id);
  });
  it.each(['disabled', 'hours', 'quota', 'group', 'room'] as const)(
    '%s change after admission skips the due turn without publishing',
    (change) => {
      const { db, state } = autoFixture(2);
      advanceMockBot(AUTO_NOW);
      db.botSettings.autoGenerate = false;
      const thread = state.threads[0];
      const second = db.personas.find((p) => p.id === thread?.snapshot.lines[1]?.personaId);
      if (!thread || !second) throw new Error('Missing automatic participant');
      if (change === 'disabled') second.enabled = false;
      if (change === 'hours') second.activeHours = '01:00 - 02:00';
      if (change === 'quota')
        state.daily.set(mockPersonaDayKey(second.id, AUTO_NOW), second.postsPerDay);
      if (change === 'group') db.groups = db.groups.filter((g) => g.id !== 'c1');
      if (change === 'room') db.rooms = db.rooms.filter((r) => !r.isDefault || r.groupId !== 'c1');
      advanceMockBot(AUTO_NOW + 60000);
      expect(thread).toMatchObject({ cursor: 2, status: 'running' });
      expect(db.botMessageMeta.size).toBe(1);
      expect(state.activity[0]?.text).toContain('Bỏ lượt 2');
    },
  );

  it('rate denial retains the due cursor/draft and retries without duplicate publication', () => {
    const { db, state } = autoFixture(2);
    advanceMockBot(AUTO_NOW);
    db.botSettings.autoGenerate = false;
    const thread = state.threads[0];
    if (!thread) throw new Error('Missing automatic work');
    state.groupRate.set(
      'c1',
      Array.from({ length: 30 }, () => AUTO_NOW + 60000),
    );
    advanceMockBot(AUTO_NOW + 60000);
    expect(thread.cursor).toBe(1);
    expect(thread.snapshot.lines[1]?.body).toBe('Mình chia sẻ thêm về chủ đề: First topic');
    expect(db.botMessageMeta.size).toBe(1);
    advanceMockBot(AUTO_NOW + 120000);
    advanceMockBot(AUTO_NOW + 120000);
    expect(thread.cursor).toBe(2);
    expect(db.botMessageMeta.size).toBe(2);
  });

  it.each(['global', 'feature'] as const)(
    '%s pause does not generate or consume the next turn',
    (flag) => {
      const { db, state } = autoFixture(2);
      advanceMockBot(AUTO_NOW);
      const thread = state.threads[0];
      if (!thread) throw new Error('Missing automatic work');
      if (flag === 'global') db.botSettings.enabled = false;
      else state.featureEnabled = false;
      advanceMockBot(AUTO_NOW + 60000);
      expect(thread.cursor).toBe(1);
      expect(thread.snapshot.lines[1]?.body).toBe('');
      expect(db.botMessageMeta.size).toBe(1);
    },
  );

  it('generated keyword text still posts, creates one auto report, and never fabricates a member reporter', () => {
    const { db } = autoFixture(2);
    const keyword = listKeywords()[0];
    if (!keyword) throw new Error('Missing moderation keyword');
    db.botSettings.topics = [keyword];
    advanceMockBot(AUTO_NOW);
    const messageId = [...db.botMessageMeta.keys()][0];
    expect(messageId).toBeTruthy();
    expect(drainMockKeywordHits(AUTO_NOW)).toBe(1);
    expect(drainMockKeywordHits(AUTO_NOW)).toBe(0);
    const reports = db.reports.filter((report) => db.reportMessageIds.get(report.id) === messageId);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ source: 'auto', status: 'open', reporterCount: 0 });
    expect(db.messages.get('c1-general')?.some((message) => message.id === messageId)).toBe(true);
  });
});
