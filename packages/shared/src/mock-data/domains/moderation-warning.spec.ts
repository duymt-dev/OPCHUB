import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actOnReport, reportMessage } from './ops-community';
import { sendChatMessage } from './chat-messages';
import { inboxNotifications } from './inbox';
import { mockDb, resetMockDb } from './store';
import { processMockKeywordHit } from './moderation-jobs';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';
import {
  drainMockModerationWarnings,
  enqueueMockModerationWarning,
  pendingMockModerationWarnings,
} from './moderation-warning-jobs';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  mockDb().botSettings.enabled = false;
  mockDb().notifications.clear();
});
afterEach(() => vi.useRealTimers());

function humanReport() {
  const sent = sendChatMessage('m1', 'c1-general', {
    clientMsgId: 'warning-source',
    kind: 'text',
    body: 'Moderation source',
    mentions: [],
  });
  if (!sent.ok) throw new Error(sent.message);
  const reported = reportMessage(sent.data.id, { reason: 'other' });
  if (!reported.ok) throw new Error(reported.message);
  return { source: sent.data, report: reported.data };
}

describe('TIP-V2-502 NA-07 REQ-207 deferred member warning', () => {
  it('warn resolves immediately but delivers one recipient-specific notification only through the worker/read path', () => {
    const { source, report } = humanReport();
    expect(actOnReport(report.id, 'warn').ok).toBe(true);
    expect(mockDb().notifications.get('m1') ?? []).toEqual([]);
    const inbox = inboxNotifications('m1', Date.now());
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      type: 'group',
      title: 'Tin nhắn của bạn vi phạm nội quy nhóm',
      link: '/chat/c1',
      read: false,
      createdAt: new Date().toISOString(),
    });
    expect(source.body).toBe('Moderation source');
    expect(inboxNotifications('m2', Date.now())).toEqual([]);
    expect(actOnReport(report.id, 'warn')).toMatchObject({ ok: false, status: 409 });
    expect(inboxNotifications('m1', Date.now())).toEqual(inbox);
  });

  it('warning retains captured sender/room identity even when the source is removed after reporting', () => {
    const { report } = humanReport();
    mockDb().messages.set('c1-general', []);
    expect(actOnReport(report.id, 'warn').ok).toBe(true);
    expect(inboxNotifications('m1', Date.now())).toHaveLength(1);
  });

  it('separate manual/automatic reports on the same message have distinct warning identities', () => {
    const { source, report } = humanReport();
    const automatic = processMockKeywordHit({ messageId: source.id, hit: 'VAY NÓNG' });
    if (!automatic) throw new Error('Missing automatic case');
    expect(actOnReport(report.id, 'warn').ok).toBe(true);
    expect(actOnReport(automatic.id, 'warn').ok).toBe(true);
    expect(pendingMockModerationWarnings()).toBe(2);
    const inbox = inboxNotifications('m1', Date.now());
    expect(new Set(inbox.map((row) => row.id)).size).toBe(2);
    expect(inbox.map((row) => row.id).sort()).toEqual(
      [report.id, automatic.id].map((id) => `moderation-warn-${id}`).sort(),
    );
  });

  it('persona/null sender warns resolve and audit without targeting a same-name human account', () => {
    const message = writeThreadMessage('persona-warning', 'persona-warning', 0, {
      sender: { name: 'Lê Minh Anh', avatarUrl: null },
    });
    const result = reportMessage(message.id, { reason: 'other' });
    if (!result.ok) throw new Error(result.message);
    expect(actOnReport(result.data.id, 'warn').ok).toBe(true);
    expect(pendingMockModerationWarnings()).toBe(0);
    expect(inboxNotifications('m1', Date.now())).toEqual([]);
  });

  it('a missing room is consumed without a notification; replay never schedules another warning', () => {
    const { report } = humanReport();
    actOnReport(report.id, 'warn');
    mockDb().rooms = mockDb().rooms.filter((row) => row.id !== 'c1-general');
    expect(drainMockModerationWarnings()).toBe(1);
    expect(drainMockModerationWarnings()).toBe(0);
    expect(enqueueMockModerationWarning(report.id)).toBe(false);
    expect(inboxNotifications('m1', Date.now())).toEqual([]);
  });

  it('live timestamps do not drift on later inbox reads or on worker replay', () => {
    const { report } = humanReport();
    actOnReport(report.id, 'warn');
    const first = inboxNotifications('m1', Date.now());
    vi.setSystemTime(Date.now() + 3600000);
    expect(inboxNotifications('m1', Date.now())).toEqual(first);
    expect(drainMockModerationWarnings()).toBe(0);
  });

  it('warning runtime keeps the newest50 and does not trim another recipient', () => {
    const { source } = humanReport();
    mockDb().notifications.set('m2', [
      {
        id: 'other',
        type: 'group',
        title: 'Other',
        body: '',
        link: '/chat/c1',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    for (let i = 0; i < 51; i++) {
      const report = reportMessage(source.id, { reason: 'other' });
      if (!report.ok) throw new Error(report.message);
      actOnReport(report.data.id, 'warn');
    }
    expect(inboxNotifications('m1', Date.now())).toHaveLength(50);
    expect(inboxNotifications('m2', Date.now())).toHaveLength(1);
    expect(pendingMockModerationWarnings()).toBe(0);
  });

  it.each(['hide', 'dismiss', 'lock'] as const)(
    '%s does not enqueue a warning notification',
    (action) => {
      const { report } = humanReport();
      expect(actOnReport(report.id, action).ok).toBe(true);
      expect(pendingMockModerationWarnings()).toBe(0);
      expect(inboxNotifications('m1', Date.now())).toEqual([]);
    },
  );

  it('reset clears pending/source/retry state instead of delivering an old warning to a new fixture', () => {
    const { report } = humanReport();
    actOnReport(report.id, 'warn');
    expect(pendingMockModerationWarnings()).toBe(1);
    resetMockDb();
    expect(pendingMockModerationWarnings()).toBe(0);
    expect(drainMockModerationWarnings()).toBe(0);
  });
});
