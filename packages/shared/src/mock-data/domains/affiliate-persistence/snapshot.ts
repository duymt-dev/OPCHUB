import { affiliateMockState, syncMockAffiliates } from '../affiliate';
import { affiliateAdminState, paidSnapshot } from '../affiliate-admin/state';
import {
  isMockAffiliateScenarioSeeded,
  restoreMockAffiliateScenarioSeeded,
} from '../affiliate-demo';
import { readMockAffiliatePolicy, replaceMockAffiliatePolicy } from '../affiliate-policy';
import { auditLog } from '../group-admin';
import { readMockAffiliateSettingsLog, replaceMockAffiliateSettingsLog } from '../settings-log';
import { mockDb } from '../store';
import { affiliateSnapshotSchema, type AffiliateSnapshot } from './schema';
import { captureMockAffiliateWebhooks, restoreMockAffiliateWebhooks } from './webhooks';
import { captureMockWelcomeSeen, restoreMockWelcomeSeen } from '../welcome-state';

/** Capture after domain synchronization; clone/validate before crossing a storage boundary. */
export function captureMockAffiliateSnapshot(): AffiliateSnapshot {
  const db = mockDb();
  const state = syncMockAffiliates();
  // Freeze historical banks before any later live-bank edit or runtime reset.
  [...state.referrals.values()].filter((r) => r.row.status === 'paid').forEach(paidSnapshot);
  const extra = affiliateAdminState();
  return affiliateSnapshotSchema.parse({
    version: 1,
    demoSeeded: isMockAffiliateScenarioSeeded(),
    welcomeSeen: captureMockWelcomeSeen(),
    webhooks: captureMockAffiliateWebhooks(),
    fees: db.fees,
    agents: [...state.agents],
    referrals: [...state.referrals],
    payouts: [...state.payouts],
    knownFees: [...state.knownFees],
    clicks: [...state.clicks].map(([key, days]) => [key, [...days]]),
    seen: [...state.seen],
    seq: state.seq,
    dbSeq: db.seq,
    policy: readMockAffiliatePolicy(),
    snapshots: [...extra.snapshots],
    receipts: [...extra.receipts],
    notices: [...db.notifications].map(([key, rows]) => [
      key,
      rows.filter((r) => r.type === 'affiliate'),
    ]),
    settingsLog: readMockAffiliateSettingsLog(),
    audit: auditLog().filter((row) => row.action.startsWith('affiliate.')),
  });
}

/** Reject the ENTIRE payload before touching live state; restore never replays money effects. */
export function restoreMockAffiliateSnapshot(input: unknown): void {
  const data = affiliateSnapshotSchema.parse(input);
  const db = mockDb();
  const state = affiliateMockState();
  const extra = affiliateAdminState();
  db.fees = data.fees;
  db.seq = Math.max(db.seq, data.dbSeq);
  state.agents = new Map(data.agents);
  state.referrals = new Map(data.referrals);
  state.payouts = new Map(data.payouts);
  state.knownFees = new Map(data.knownFees);
  state.clicks = new Map(data.clicks.map(([key, days]) => [key, new Map(days)]));
  state.seen = new Map(data.seen);
  state.seq = data.seq;
  extra.snapshots = new Map(data.snapshots);
  extra.receipts = new Map(data.receipts);
  replaceMockAffiliatePolicy(data.policy);
  restoreMockAffiliateScenarioSeeded(data.demoSeeded);
  restoreMockAffiliateWebhooks(data.webhooks);
  restoreMockWelcomeSeen(data.welcomeSeen);
  restoreNotices(data);
  replaceMockAffiliateSettingsLog(data.settingsLog);
  const audit = auditLog();
  const other = audit.filter((row) => !row.action.startsWith('affiliate.'));
  audit.splice(0, audit.length, ...data.audit, ...other);
}

function restoreNotices(data: AffiliateSnapshot) {
  const notices = mockDb().notifications;
  for (const [id, rows] of notices)
    notices.set(
      id,
      rows.filter((row) => row.type !== 'affiliate'),
    );
  for (const [id, rows] of data.notices) {
    notices.set(id, [...rows, ...(notices.get(id) ?? [])]);
  }
}
