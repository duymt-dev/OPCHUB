import { KeywordMatcher } from '../../moderation/keyword-matcher';
import { KEYWORD_REASON } from '../../moderation/keyword-reason';
import { jobs as queueJobs } from '../../queues/queues';
import type { Report } from '../../api-domains';
import { listKeywords } from './group-admin';
import { mockDb, nextId } from './store';
import type { MockDb } from './store-types';
import { iso } from './util';
import { rememberMockReportSource } from './report-context';
import { hideAndCountMock, restoredMock } from './moderation-violations';

interface KeywordState {
  matcher: KeywordMatcher;
  fingerprint: string;
  queued: Set<string>;
  pending: Map<string, string>;
}
const states = new WeakMap<MockDb, KeywordState>();
function state() {
  const db = mockDb();
  let value = states.get(db);
  if (!value) {
    value = {
      matcher: new KeywordMatcher([]),
      fingerprint: '',
      queued: new Set(),
      pending: new Map(),
    };
    states.set(db, value);
  }
  return value;
}

/** Post-commit hook equivalent: a durable-in-runtime job, never hide/filter the send. */
export function enqueueMockKeywordHit(messageId: string): boolean {
  const job = state();
  if (job.queued.has(messageId)) return false;
  const message = [...mockDb().messages.values()].flat().find((row) => row.id === messageId);
  if (!message) return false;
  const words = listKeywords();
  const fingerprint = JSON.stringify(words);
  if (job.fingerprint !== fingerprint) {
    job.matcher = new KeywordMatcher(words);
    job.fingerprint = fingerprint;
  }
  const hit = job.matcher.firstHit(message.body);
  if (!hit) return false;
  job.queued.add(messageId);
  job.pending.set(messageId, hit.slice(0, 60));
  return true;
}

/** Native upsertOpenCase semantics: one OPEN auto case per message, zero reporters. */
export function processMockKeywordHit(input: unknown, now = Date.now()): Report | null {
  const { messageId, hit } = queueJobs.moderation.keywordHit.parse(input);
  const db = mockDb();
  const message = [...db.messages.values()].flat().find((row) => row.id === messageId);
  if (!message) return null;
  const existing = db.reports.find(
    (row) =>
      row.source === 'auto' &&
      row.status === 'open' &&
      db.reportMessageIds.get(row.id) === messageId,
  );
  if (existing) return existing;
  if (restoredMock(messageId)) return null;
  const room = db.rooms.find((row) => row.id === message.roomId);
  const group = db.groups.find((row) => row.id === room?.groupId);
  const report: Report = {
    id: nextId('r'),
    source: 'auto',
    status: 'open',
    reporterCount: 0,
    senderName: message.isSimulated ? 'Hệ thống' : message.sender.name,
    groupName: group?.name ?? '',
    body: message.body,
    hit,
    reason: KEYWORD_REASON[hit.toLocaleLowerCase('vi')] ?? 'other',
    createdAt: iso(now),
    violations: 0,
    senderLocked: false,
    lockedUntil: null,
    canLock: false,
  };
  db.reportMessageIds.set(report.id, messageId);
  rememberMockReportSource(report.id, message);
  db.reports.unshift(report);
  // V4-612 (D-77): trúng từ khoá → ẩn ngay + tính vi phạm
  hideAndCountMock(report.id, now);
  return report;
}

export function drainMockKeywordHits(now = Date.now()): number {
  const job = state();
  let handled = 0;
  for (const [messageId, hit] of job.pending) {
    processMockKeywordHit({ messageId, hit }, now);
    job.pending.delete(messageId);
    handled++;
  }
  return handled;
}

export const pendingMockKeywordHits = () => state().pending.size;
