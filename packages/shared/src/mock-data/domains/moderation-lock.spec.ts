import { beforeEach, describe, expect, it } from 'vitest';
import { auditLog } from './audit-store';
import { actOnReport, reportMessage } from './ops-community';
import { sendChatMessage } from './chat-messages';
import {
  mockMemberLockReason,
  setMockMemberStatus,
  setMockMembersStatus,
} from './member-lifecycle';
import {
  mockMemberAccessToken,
  mockMemberEpoch,
  parseMockMemberToken,
  registerMockSessionMember,
} from './member-sessions';
import { mockDb, resetMockDb } from './store';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  resetMockDb();
  mockDb().botSettings.enabled = false;
});
function sourceReport() {
  const sent = sendChatMessage('m1', 'c1-general', {
    clientMsgId: 'lock',
    kind: 'text',
    body: 'Source',
    mentions: [],
  });
  if (!sent.ok) throw new Error(sent.message);
  const report = reportMessage(sent.data.id, { reason: 'other' });
  if (!report.ok) throw new Error(report.message);
  return report.data;
}
describe('REQ-207 NA-16 UAT-24 captured-member lock lifecycle', () => {
  it('records the real target, actor and note, resolves once and leaves message visibility untouched', () => {
    const report = sourceReport();
    expect(actOnReport(report.id, 'lock', 'adm-yen', 'Specific reason').ok).toBe(true);
    expect(mockDb().userStatus.get('m1')).toBe('locked');
    expect(mockMemberLockReason('m1')).toBe('Specific reason');
    expect(mockMemberEpoch('m1')).toBe(1);
    expect(auditLog()).toHaveLength(2);
    expect(auditLog()[0]).toMatchObject({
      actorId: 'adm-yen',
      action: 'user.lock',
      target: 'm1',
      diff: { reason: 'Specific reason' },
    });
    expect(auditLog()[1]).toMatchObject({
      actorId: 'adm-yen',
      action: 'moderation.lock',
      target: report.id,
    });
    expect(actOnReport(report.id, 'lock')).toMatchObject({ ok: false, status: 409 });
    expect(mockMemberEpoch('m1')).toBe(1);
    expect(auditLog()).toHaveLength(2);
    expect(
      mockDb()
        .messages.get('c1-general')
        ?.find((m) => m.id === mockDb().reportMessageIds.get(report.id))?.hiddenAt,
    ).toBeUndefined();
  });

  it('uses the native default reason and retains source identity after message removal', () => {
    const report = sourceReport();
    mockDb().messages.set('c1-general', []);
    actOnReport(report.id, 'lock');
    expect(mockDb().userStatus.get('m1')).toBe('locked');
    expect(mockMemberLockReason('m1')).toBe('Vi phạm nội quy chat');
  });

  it('already locked sender resolves a new case without a second account audit or epoch bump', () => {
    const report = sourceReport();
    setMockMemberStatus('m1', 'locked');
    auditLog().splice(0);
    expect(actOnReport(report.id, 'lock').ok).toBe(true);
    expect(mockMemberEpoch('m1')).toBe(1);
    expect(auditLog().map((row) => row.action)).toEqual(['moderation.lock']);
  });

  it('a persona matching a human display name has no account/session target', () => {
    const message = writeThreadMessage('persona-lock', 'persona-lock', 0, {
      sender: { name: 'Lê Minh Anh', avatarUrl: null },
    });
    const report = reportMessage(message.id, { reason: 'other' });
    if (!report.ok) throw new Error(report.message);
    actOnReport(report.data.id, 'lock');
    expect(mockDb().userStatus.get('m1')).toBe('active');
    expect(mockMemberEpoch('m1')).toBe(0);
    expect(auditLog().map((row) => row.action)).toEqual(['moderation.lock']);
  });

  it('bulk transitions dedupe IDs, skip unchanged/unknown rows, revoke only changed users and audit reasons', () => {
    expect(
      setMockMembersStatus(['m1', 'm1', 'm2', 'missing'], 'locked', 'admin', 'Bulk reason'),
    ).toMatchObject({ data: { updated: 2 } });
    expect(mockMemberEpoch('m1')).toBe(1);
    expect(mockMemberEpoch('m2')).toBe(1);
    expect(mockMemberEpoch('missing')).toBe(0);
    expect(auditLog()).toHaveLength(2);
    expect(setMockMembersStatus(['m1', 'm2'], 'locked')).toMatchObject({ data: { updated: 0 } });
    expect(setMockMemberStatus('m1', 'active').ok).toBe(true);
    expect(mockMemberAccessToken('m1')).toBe('mock.m1~2');
  });

  it('fresh session registration does not unlock an existing account; reset clears reasons and epochs', () => {
    setMockMemberStatus('m1', 'locked');
    registerMockSessionMember('m1', 'active');
    expect(mockDb().userStatus.get('m1')).toBe('locked');
    resetMockDb();
    expect(mockMemberEpoch('m1')).toBe(0);
    expect(mockMemberLockReason('m1')).toBeNull();
    expect(mockMemberAccessToken('m1')).toBe('mock.m1');
  });

  it.each([
    'mock.m1~no',
    'mock.m1~-1',
    'mock.m1~1.5',
    'mock.m1~999999999999999999999',
    'mock.',
    'real.token',
  ])('invalid fake token %s fails closed', (token) => {
    expect(parseMockMemberToken(token)).toBeNull();
  });
});
