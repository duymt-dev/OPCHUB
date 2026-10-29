import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botThreadSchema, chatMessageSchema } from '../../api-domains';
import { admitMockBotReply } from './bot-reply-admission';
import { advanceMockBot, listBotThreads } from './bot-execution';
import { listChatMessages, sendChatMessage } from './chat-messages';
import { mockDashboardThreads } from './dashboard-threads';
import { REPLY_NOW, replyFixture, memberSource, replyThread } from './tests/bot-reply-fixture';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(REPLY_NOW);
  replyFixture();
});
afterEach(() => vi.useRealTimers());

describe('UAT-14 UAT-15 REQ-411 MSW delayed reply publication', () => {
  it('a real send queues a reply, publishes exactly once at its deadline and appears as a normal member in chat/Dashboard', () => {
    const { db, state, first } = replyFixture();
    const source = sendChatMessage('m1', 'c1-general', {
      clientMsgId: 'actual-send',
      kind: 'text',
      body: 'Real question',
      mentions: [],
    });
    if (!source.ok) throw new Error(source.message);
    expect(state.replies.current?.value).toMatchObject({
      status: 'running',
      total: 1,
      processed: 0,
    });
    expect(state.threads).toHaveLength(0);
    advanceMockBot(REPLY_NOW + 4999);
    expect([...db.messages.values()].flat().filter((m) => m.isSimulated)).toEqual([]);
    advanceMockBot(REPLY_NOW + 5000);
    advanceMockBot(REPLY_NOW + 5001);
    const thread = state.threads.find((row) => row.kind === 'reply');
    if (!thread) throw new Error('Missing materialized reply');
    expect(botThreadSchema.parse(listBotThreads(false)[0]).kind).toBe('reply');
    expect(thread).toMatchObject({ status: 'done', cursor: 1, nextAt: null });
    const page = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    if (!page.ok) throw new Error(page.message);
    const reply = page.data.items.find((m) => m.id !== source.data.id);
    expect(reply).toMatchObject({
      sender: { name: first.name },
      body: 'Mình chia sẻ thêm về chủ đề: Real question',
      replyTo: { text: 'Real question' },
    });
    expect(() => chatMessageSchema.strict().parse(reply)).not.toThrow();
    expect(reply).not.toHaveProperty('isSimulated');
    expect(mockDashboardThreads()).toHaveLength(1);
    expect(mockDashboardThreads()[0]?.id).toBe(reply?.id);
    expect(state.todayCount).toBe(1);
    expect(state.activity[0]?.text).toBe('Đã đăng lượt 1/1: Real question');
    expect(admitMockBotReply(source.data.id, REPLY_NOW + 180000)).toBeNull();
  });

  it.each(['feature', 'global', 'reply'] as const)(
    '%s pause preserves the pending cursor and resumes only after the flag is restored',
    (flag) => {
      const { db, state } = replyFixture();
      admitMockBotReply(memberSource().id);
      const thread = replyThread();
      if (flag === 'feature') state.featureEnabled = false;
      if (flag === 'global') db.botSettings.enabled = false;
      if (flag === 'reply') db.botSettings.replyToMembers = false;
      advanceMockBot(REPLY_NOW + 5000);
      expect(thread).toMatchObject({ status: 'scheduled', cursor: 0 });
      expect(state.todayCount).toBe(0);
      state.featureEnabled = true;
      db.botSettings.enabled = true;
      db.botSettings.replyToMembers = true;
      advanceMockBot(REPLY_NOW + 60000);
      expect(thread.status).toBe('done');
      expect(state.todayCount).toBe(1);
    },
  );

  it.each(['hidden', 'deleted', 'group-deleted', 'persona-disabled', 'unassigned'] as const)(
    'rechecks %s at publication and terminates without a message',
    (condition) => {
      const { db, state, first } = replyFixture();
      const source = memberSource();
      admitMockBotReply(source.id);
      const thread = replyThread();
      if (condition === 'hidden') {
        const stored = db.messages.get('c1-general')?.find((m) => m.id === source.id);
        if (!stored) throw new Error('Missing source');
        stored.hiddenAt = new Date().toISOString();
      }
      if (condition === 'deleted') db.messages.set('c1-general', []);
      if (condition === 'group-deleted') db.groups = db.groups.filter((g) => g.id !== 'c1');
      if (condition === 'persona-disabled') first.enabled = false;
      if (condition === 'unassigned') first.groupIds = ['c2'];
      advanceMockBot(REPLY_NOW + 5000);
      expect(thread).toMatchObject({ status: 'done', cursor: 1, nextAt: null });
      expect(state.todayCount).toBe(0);
      expect([...db.messages.values()].flat().some((m) => m.isSimulated)).toBe(false);
      expect(mockDashboardThreads()).toEqual([]);
    },
  );

  it.each(['hours', 'quota'] as const)(
    'D-112 publication ignores script %s limits',
    (condition) => {
      const { first, state } = replyFixture();
      admitMockBotReply(memberSource().id);
      if (condition === 'hours') first.activeHours = '01:00 - 02:00';
      if (condition === 'quota') state.daily.set(`${first.id}:2026-10-21`, first.postsPerDay);
      advanceMockBot(REPLY_NOW + 5000);
      expect(state.todayCount).toBe(1);
      expect(state.threads[0]).toMatchObject({ status: 'done', cursor: 1 });
    },
  );

  it('D-112 reply budget is independent of script/auto burst traffic', () => {
    const { db, state, second } = replyFixture();
    const third = db.personas[2];
    if (!third) throw new Error('Missing third persona');
    admitMockBotReply(memberSource().id);
    const thread = replyThread();
    for (let i = 0; i < 30; i++)
      writeThreadMessage(`script-${i}`, `script-${i}`, 0, {
        personaId: i < 15 ? second.id : third.id,
        createdAt: new Date(REPLY_NOW + 4000).toISOString(),
      });
    advanceMockBot(REPLY_NOW + 5000);
    expect(thread).toMatchObject({ status: 'done', cursor: 1 });
    expect(state.todayCount).toBe(1);
    advanceMockBot(REPLY_NOW + 64000);
    expect(thread.status).toBe('done');
    expect(state.todayCount).toBe(1);
  });
});
