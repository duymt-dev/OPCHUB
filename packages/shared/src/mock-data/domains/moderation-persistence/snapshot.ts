import { mockDb } from '../store';
import { mockReportSources } from '../report-context';
import { mockViolationState } from '../moderation-violations';
import { mockLocks, mockMemberLockReasons } from '../member-lifecycle';
import { mockMemberEpochs } from '../member-sessions';
import { mockKeywordJobs } from '../moderation-jobs';
import { moderationSnapshotSchema, type ModerationSnapshot } from './schema';

export function captureModerationSnapshot(): ModerationSnapshot {
  const db = mockDb();
  const violations = mockViolationState();
  const jobs = mockKeywordJobs();
  return moderationSnapshotSchema.parse({
    reports: db.reports,
    messageIds: [...db.reportMessageIds],
    sources: [...mockReportSources()],
    violations: [...violations.violations],
    settings: violations.settings,
    restored: [...violations.restored],
    statuses: [...db.userStatus],
    locks: [...mockLocks()],
    reasons: [...mockMemberLockReasons()],
    epochs: [...mockMemberEpochs()],
    keywordJobs: { queued: [...jobs.queued], pending: [...jobs.pending] },
  });
}

function replace<K, V>(target: Map<K, V>, entries: [K, V][]) {
  target.clear();
  for (const [key, value] of entries) target.set(key, value);
}

/** Validate first; restore records without transitions, audit replay or token resurrection. */
export function restoreModerationSnapshot(input: unknown): void {
  const data = moderationSnapshotSchema.parse(input);
  const db = mockDb();
  db.reports = data.reports;
  db.reportMessageIds = new Map(data.messageIds);
  replace(mockReportSources(), data.sources);
  const violations = mockViolationState();
  violations.violations = new Map(data.violations);
  violations.settings = data.settings;
  violations.restored = new Set(data.restored);
  replace(db.userStatus, data.statuses);
  replace(mockLocks(), data.locks);
  replace(mockMemberLockReasons(), data.reasons);
  replace(mockMemberEpochs(), data.epochs);
  const jobs = mockKeywordJobs();
  jobs.queued = new Set(data.keywordJobs.queued);
  jobs.pending = new Map(data.keywordJobs.pending);
}
