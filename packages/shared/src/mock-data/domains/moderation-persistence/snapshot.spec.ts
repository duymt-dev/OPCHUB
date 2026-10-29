import { beforeEach, expect, it } from 'vitest';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from '../community-persistence/snapshot';
import { auditLog } from '../audit-store';
import { sendChatMessage } from '../chat-messages';
import { drainMockKeywordHits, pendingMockKeywordHits } from '../moderation-jobs';
import { mockMemberEpoch } from '../member-sessions';
import {
  mockLockedUntil,
  mockViolationCount,
  restoreMock,
  sweepMockExpiredLocks,
  withMockViolations,
} from '../moderation-violations';
import { mockDb, resetMockDb } from '../store';
import { captureModerationSnapshot, restoreModerationSnapshot } from './snapshot';

beforeEach(resetMockDb);
const now = Date.UTC(2026, 9, 29, 2);

function send(key: string) {
  const result = sendChatMessage('m1', 'c1-general', {
    clientMsgId: key,
    kind: 'text',
    body: `vay nóng ${key}`,
    mentions: [],
  });
  if (!result.ok) throw new Error(result.message);
  return result.data.id;
}

function lock() {
  send('first');
  drainMockKeywordHits(now);
  send('second');
  drainMockKeywordHits(now);
  expect(mockViolationCount('m1', now)).toBe(2);
  expect(mockDb().userStatus.get('m1')).toBe('locked');
  return captureCommunitySnapshot();
}

it('E2E-05 FX-01 preserves reports, sender identity, seven-day lock and revoked epochs across runtimes', () => {
  const snapshot = lock();
  const records = captureModerationSnapshot();
  const epoch = mockMemberEpoch('m1');
  resetMockDb();
  restoreCommunitySnapshot(JSON.parse(JSON.stringify(snapshot)) as unknown);
  expect(captureModerationSnapshot()).toEqual(records);
  expect(mockDb().userStatus.get('m1')).toBe('locked');
  expect(mockLockedUntil('m1')).toBe(now + 7 * 86_400_000);
  expect(mockMemberEpoch('m1')).toBe(epoch);
  const reports = mockDb().reports.filter((r) => r.body.includes('vay nóng'));
  expect(reports).toHaveLength(2);
  for (const report of reports)
    expect(withMockViolations(report, now)).toMatchObject({
      violations: 2,
      senderLocked: true,
      canLock: false,
    });
  restoreCommunitySnapshot(snapshot);
  expect(captureModerationSnapshot()).toEqual(records);
  expect(auditLog()).toHaveLength(0); // Restoration must not execute account transitions.
});

it('E2E-05 persisted invalid moderation cannot partially mutate the community composition', () => {
  const snapshot = lock();
  const bad = { ...snapshot, moderation: { ...captureModerationSnapshot(), epochs: [['m1', -1]] } };
  expect(() => restoreCommunitySnapshot(bad)).toThrow();
  expect(captureCommunitySnapshot()).toEqual(snapshot);
  expect(() =>
    restoreModerationSnapshot({ ...captureModerationSnapshot(), accessToken: 'forbidden' }),
  ).toThrow();
  expect(captureCommunitySnapshot()).toEqual(snapshot);
});

it('E2E-05 persisted lock expires once and does not resurrect old session epochs', () => {
  const snapshot = lock();
  resetMockDb();
  restoreCommunitySnapshot(snapshot);
  const epoch = mockMemberEpoch('m1');
  const until = now + 7 * 86_400_000;
  expect(sweepMockExpiredLocks(until - 1)).toBe(0);
  expect(sweepMockExpiredLocks(until)).toBe(1);
  expect(sweepMockExpiredLocks(until)).toBe(0);
  expect(mockDb().userStatus.get('m1')).toBe('active');
  expect(mockMemberEpoch('m1')).toBe(epoch + 1);
});

it('E2E-05 restoring a persisted violation removes its count and automatic lock, not other reports', () => {
  const snapshot = lock();
  resetMockDb();
  restoreCommunitySnapshot(snapshot);
  const report = mockDb().reports.find((r) => r.body === 'vay nóng first');
  if (!report) throw new Error('Missing persisted report');
  expect(restoreMock(report.id, 'admin', now)).toBe(true);
  expect(mockViolationCount('m1', now)).toBe(1);
  expect(mockDb().userStatus.get('m1')).toBe('active');
  expect(restoreMock(report.id, 'admin', now)).toBe(false);
});

it('E2E-05 pending keyword work survives reload without duplicate reports', () => {
  const id = send('pending');
  const snapshot = captureCommunitySnapshot();
  resetMockDb();
  restoreCommunitySnapshot(snapshot);
  expect(pendingMockKeywordHits()).toBe(1);
  expect(drainMockKeywordHits(now)).toBe(1);
  expect(drainMockKeywordHits(now)).toBe(0);
  expect(
    [...mockDb().reportMessageIds.values()].filter((messageId) => messageId === id),
  ).toHaveLength(1);
});
