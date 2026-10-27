import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actOnReport, reportMessage } from './ops-community';
import { HIDDEN_MESSAGE_TEXT } from '../../api-domains';
import { listChatMessages } from './chat-messages';
import { roomPins } from './chat-ops';
import { processMockKeywordHit, pendingMockKeywordHits } from './moderation-jobs';
import { mockDb, resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());

describe('P5-MSW-02 report/message identity and native demo alignment', () => {
  it('seeded cases keep the native rpt-ID link but the messages are not in any room (D-89, prototype v4)', () => {
    const db = mockDb();
    db.groupMembers.set('m1', new Map(db.groups.map((group) => [group.id, 'member' as const])));
    expect(db.reports).toHaveLength(4);
    const all = [...db.messages.values()].flat();
    for (const report of db.reports) {
      const id = db.reportMessageIds.get(report.id);
      expect(id).toBe(`rpt-${report.id}`);
      expect(all.some((row) => row.id === id)).toBe(false);
    }
    expect(pendingMockKeywordHits()).toBe(0);
  });

  it('acting on a historical case resolves it without a room message', () => {
    expect(actOnReport('r1', 'hide').ok).toBe(true);
    expect(mockDb().reports.find((row) => row.id === 'r1')?.status).toBe('resolved');
  });

  it('manual and automatic cases use shared message links and close together without erasing body', () => {
    const db = mockDb();
    db.reports = [];
    const source = [...db.messages.values()].flat().find((row) => row.id === 'c1-general-0');
    if (!source) throw new Error('Missing source');
    const a = reportMessage(source.id, { reason: 'other' });
    const b = processMockKeywordHit({ messageId: source.id, hit: 'word' });
    if (!a.ok || !b) throw new Error('Missing linked cases');
    expect(db.reportMessageIds.get(a.data.id)).toBe(source.id);
    expect(db.reportMessageIds.get(b.id)).toBe(source.id);
    const body = source.body;
    expect(actOnReport(b.id, 'hide').ok).toBe(true);
    expect(a.data.status).toBe('resolved');
    expect(source.body).toBe(body);
    // V4-612: tin thành viên bị ẩn vẫn giữ chỗ trong phòng, không lộ nội dung
    const page = listChatMessages('m1', source.roomId, undefined, undefined, 100);
    const row = page.ok ? page.data.items.find((x) => x.id === source.id) : undefined;
    expect(row?.hiddenAt).toBeDefined();
    expect(row?.body).toBe('');
  });
});

describe('V4-618 pinned hidden message (D-77, prototype v4)', () => {
  it('a reported pinned member message stays pinned with the placeholder text', () => {
    const db = mockDb();
    const pinned = roomPins('c1-general');
    const first = pinned[0];
    if (!first) throw new Error('Missing seeded pin');
    const message = db.messages.get('c1-general')?.find((m) => m.id === first.messageId);
    if (!message) throw new Error('Missing pinned message');
    message.hiddenAt = '2026-10-21T05:00:00.000Z';
    expect(roomPins('c1-general')[0]).toMatchObject({
      messageId: first.messageId,
      text: HIDDEN_MESSAGE_TEXT,
    });
    message.isSimulated = true;
    expect(roomPins('c1-general').some((p) => p.messageId === first.messageId)).toBe(false);
  });
});
