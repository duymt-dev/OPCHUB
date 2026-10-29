import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportSchema, type Message } from '../../api-domains';
import { publishMockBotMessage } from './bot-publication';
import { advanceMockBot, runBotScript } from './bot-execution';
import { listChatMessages, sendChatMessage } from './chat-messages';
import { addKeyword, removeKeyword } from './group-admin';
import {
  drainMockKeywordHits,
  enqueueMockKeywordHit,
  pendingMockKeywordHits,
  processMockKeywordHit,
} from './moderation-jobs';
import { actOnReport, reportMessage } from './ops-community';
import { mockDb, resetMockDb } from './store';
import { REPLY_NOW, replyFixture } from './tests/bot-reply-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(REPLY_NOW);
  replyFixture();
  mockDb().reports = [];
});
afterEach(() => vi.useRealTimers());

function publish(id: string, body = 'Cần VAY NÓNG') {
  const db = mockDb();
  const persona = db.personas[0];
  if (!persona) throw new Error('Missing persona');
  const message: Message = {
    id,
    roomId: 'c1-general',
    sender: { name: persona.name, avatarUrl: persona.avatarUrl },
    body,
    attachment: null,
    reactions: [],
    pinned: false,
    isSimulated: true,
    createdAt: new Date().toISOString(),
  };
  const context = { threadId: id, turn: 0, kind: 'script' as const, personaId: persona.id };
  expect(publishMockBotMessage(message, context)).toBe(true);
  return { message, context };
}

describe('NA-07 REQ-208 MSW post-publication keyword jobs', () => {
  it('actual script publication remains visible before/after one automatic case is consumed', () => {
    const { db, first } = replyFixture();
    db.reports = [];
    const script = db.scripts[0];
    if (!script) throw new Error('Missing script');
    script.enabled = true;
    script.groupIds = ['c1'];
    script.lines = [{ personaId: first.id, body: 'Cần CHUYỂN KHOẢN TRƯỚC' }];
    const run = runBotScript(script.id);
    if (!run.ok) throw new Error(run.message);
    advanceMockBot();
    expect(pendingMockKeywordHits()).toBe(1);
    expect(db.reports).toEqual([]);
    const before = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    expect(before.ok && before.data.items[0]?.body).toBe('Cần CHUYỂN KHOẢN TRƯỚC');
    expect(drainMockKeywordHits()).toBe(1);
    expect(reportSchema.parse(db.reports[0])).toMatchObject({
      source: 'auto',
      reporterCount: 0,
      status: 'open',
      hit: 'CHUYỂN KHOẢN TRƯỚC',
      reason: 'scam',
      senderName: 'Hệ thống',
    });
    // V4-612 (D-77): trúng từ khoá → ẩn ngay; tin bot ẩn rời phòng, nội dung gốc giữ để khôi phục
    const after = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    expect(after.ok && after.data.items.some((m) => m.body === 'Cần CHUYỂN KHOẢN TRƯỚC')).toBe(
      false,
    );
    expect([...db.messages.values()].flat()[0]?.hiddenAt).toBeDefined();
    expect([...db.messages.values()].flat()[0]?.body).toBe('Cần CHUYỂN KHOẢN TRƯỚC');
  });

  it('actual delayed FakeLlm-shaped reply is moderated independently of the original member message', () => {
    const { db, state } = replyFixture();
    db.reports = [];
    addKeyword('admin', 'Mình chia sẻ');
    const sent = sendChatMessage('m1', 'c1-general', {
      clientMsgId: 'reply',
      kind: 'text',
      body: 'Câu hỏi bình thường',
      mentions: [],
    });
    expect(sent.ok).toBe(true);
    expect(pendingMockKeywordHits()).toBe(0);
    advanceMockBot(REPLY_NOW + 30000);
    expect(state.todayCount).toBe(1);
    expect(pendingMockKeywordHits()).toBe(1);
    drainMockKeywordHits(REPLY_NOW + 30000);
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0]).toMatchObject({
      source: 'auto',
      hit: 'Mình chia sẻ',
      reason: 'other',
      reporterCount: 0,
    });
    expect(db.reports[0]?.body).toBe('Mình chia sẻ thêm về chủ đề: Câu hỏi bình thường');
  });

  it('member send also queues a keyword job without hiding the message or inflating reporterCount', () => {
    const db = mockDb();
    db.botSettings.replyToMembers = false;
    const sent = sendChatMessage('m1', 'c1-general', {
      clientMsgId: 'human',
      kind: 'text',
      body: 'Xin Số CCCD',
      mentions: [],
    });
    if (!sent.ok) throw new Error(sent.message);
    expect(db.reports).toHaveLength(0);
    expect(drainMockKeywordHits()).toBe(1);
    expect(db.reports[0]).toMatchObject({
      body: 'Xin Số CCCD',
      hit: 'Số CCCD',
      reason: 'personal_info',
      reporterCount: 0,
    });
    expect(db.reports[0]?.senderName).toBe(sent.data.sender.name);
    expect(sent.data.body).toBe('Xin Số CCCD');
  });

  it('publication replay, producer replay and worker replay create one open case with zero reporters', () => {
    const { message, context } = publish('once');
    expect(publishMockBotMessage(message, context)).toBe(false);
    expect(enqueueMockKeywordHit(message.id)).toBe(false);
    expect(pendingMockKeywordHits()).toBe(1);
    expect(drainMockKeywordHits()).toBe(1);
    const original = mockDb().reports[0];
    expect(processMockKeywordHit({ messageId: message.id, hit: 'VAY NÓNG' })).toBe(original);
    expect(drainMockKeywordHits()).toBe(0);
    expect(mockDb().reports).toHaveLength(1);
    expect(original?.reporterCount).toBe(0);
  });

  it('a restored case is not reopened by producer replay or a new worker delivery (V4-612)', () => {
    const { message } = publish('resolved');
    drainMockKeywordHits();
    const original = mockDb().reports[0];
    if (!original) throw new Error('Missing case');
    expect(actOnReport(original.id, 'dismiss').ok).toBe(true);
    expect(enqueueMockKeywordHit(message.id)).toBe(false);
    expect(drainMockKeywordHits()).toBe(0);
    expect(mockDb().reports).toHaveLength(1);
    // V4-612 (D-77): Admin đã khôi phục tin → giao job lại không tạo ca / không ẩn lại
    expect(processMockKeywordHit({ messageId: message.id, hit: 'VAY NÓNG' })).toBeNull();
    expect(mockDb().reports.map((row) => row.status)).toEqual(['resolved']);
    expect(message.hiddenAt).toBeUndefined();
  });

  it('captures the hit when queued and reloads the matcher only for subsequent publications', () => {
    addKeyword('admin', 'alpha');
    publish('alpha', 'ALPHA');
    removeKeyword('admin', 'alpha');
    addKeyword('admin', 'beta');
    drainMockKeywordHits();
    expect(mockDb().reports[0]?.hit).toBe('ALPHA');
    publish('no-longer-matching', 'alpha');
    expect(pendingMockKeywordHits()).toBe(0);
    publish('beta', 'BETA');
    drainMockKeywordHits();
    expect(mockDb().reports.map((row) => row.hit)).toEqual(['BETA', 'ALPHA']);
  });

  it('nonmatching posts and vanished messages do not produce automatic reports', () => {
    publish('clean', 'Nội dung bình thường');
    expect(pendingMockKeywordHits()).toBe(0);
    publish('removed');
    mockDb().messages.set('c1-general', []);
    expect(drainMockKeywordHits()).toBe(1);
    expect(mockDb().reports).toEqual([]);
  });

  it('a hidden but stored message still produces its pending case with original Admin content', () => {
    const { message } = publish('hidden');
    message.hiddenAt = new Date().toISOString();
    drainMockKeywordHits();
    expect(mockDb().reports[0]?.body).toBe(message.body);
    const page = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    expect(page.ok && page.data.items).toEqual([]);
  });

  it('same-body messages and member-reported cases stay distinct from each automatic case', () => {
    const { message } = publish('first');
    publish('second');
    expect(reportMessage(message.id, { reason: 'abuse' }).ok).toBe(true);
    drainMockKeywordHits();
    expect(mockDb().reports).toHaveLength(3);
    expect(
      mockDb()
        .reports.filter((row) => row.source === 'auto')
        .map((row) => row.reporterCount),
    ).toEqual([0, 0]);
    expect(mockDb().reports.find((row) => row.source === 'report')?.reporterCount).toBe(1);
  });

  it.each([null, { messageId: '', hit: 'word' }, { messageId: 'id', hit: 'x'.repeat(61) }])(
    'validates queued job input before mutating cases: %j',
    (input) => {
      expect(() => processMockKeywordHit(input)).toThrow();
      expect(mockDb().reports).toEqual([]);
    },
  );

  it('reset creates isolated matcher/jobs/case identities without replaying historical demo publications', () => {
    publish('pending');
    expect(pendingMockKeywordHits()).toBe(1);
    resetMockDb();
    expect(pendingMockKeywordHits()).toBe(0);
    expect(drainMockKeywordHits()).toBe(0);
    expect(mockDb().reports).toHaveLength(4);
  });
});
