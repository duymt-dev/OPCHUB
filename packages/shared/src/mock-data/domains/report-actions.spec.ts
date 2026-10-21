import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actOnReport, listMessages, reportMessage } from './ops-community';
import { listChatMessages } from './chat-messages';
import { processMockKeywordHit, pendingMockKeywordHits } from './moderation-jobs';
import { mockDb, resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());

describe('P5-MSW-02 report/message identity and native demo alignment', () => {
  it('each seeded case references the native rpt-ID hidden message, retained in Admin history but not Portal', () => {
    const db = mockDb();
    db.groupMembers.set('m1', new Map(db.groups.map((group) => [group.id, 'member' as const])));
    expect(db.reports).toHaveLength(4);
    for (const report of db.reports) {
      const id = db.reportMessageIds.get(report.id);
      expect(id).toBe(`rpt-${report.id}`);
      const message = [...db.messages.values()].flat().find((row) => row.id === id);
      if (!message) throw new Error('Missing seed message');
      expect(message.body).toBe(report.body);
      expect(message.hiddenAt).toBe('2026-10-16T08:00:00.000Z');
      const admin = listMessages(message.roomId, undefined, undefined, 100);
      expect(admin.ok && admin.data.items.some((row) => row.id === id)).toBe(true);
      const portal = listChatMessages('m1', message.roomId, undefined, undefined, 100);
      expect(portal.ok && portal.data.items.some((row) => row.id === id)).toBe(false);
    }
    expect(pendingMockKeywordHits()).toBe(0);
  });

  it('hiding already-hidden historical messages keeps their original hide timestamp', () => {
    const db = mockDb();
    const message = [...db.messages.values()].flat().find((row) => row.id === 'rpt-r1');
    if (!message) throw new Error('Missing historical message');
    const at = message.hiddenAt;
    expect(actOnReport('r1', 'hide').ok).toBe(true);
    expect(message.hiddenAt).toBe(at);
    expect(db.reports.find((row) => row.id === 'r1')?.status).toBe('resolved');
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
    const page = listChatMessages('m1', source.roomId, undefined, undefined, 100);
    expect(page.ok && page.data.items.some((row) => row.id === source.id)).toBe(false);
  });
});
