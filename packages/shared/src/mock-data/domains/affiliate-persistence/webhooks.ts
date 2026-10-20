import { configureMockBankWebhookScheduler } from '../membership-flow';
import { feeAction } from '../ops-admin';
import { mockDb, type MockDb } from '../store';

const pending = new WeakMap<MockDb, Map<string, number>>();
let enabled = false;
function jobs() {
  let value = pending.get(mockDb());
  if (!value) {
    value = new Map();
    pending.set(mockDb(), value);
  }
  return value;
}

export const mockAffiliatePersistenceEnabled = () => enabled;
export const captureMockAffiliateWebhooks = () => [...jobs()];
export function restoreMockAffiliateWebhooks(rows: [string, number][]): void {
  pending.set(mockDb(), new Map(rows));
}
export function enableMockAffiliatePersistence(): void {
  enabled = true;
  configureMockBankWebhookScheduler((userId, delayMs) => jobs().set(userId, Date.now() + delayMs));
}
/** Run due fake bank events inside the shared transaction, never in an unpersisted timer. */
export function flushMockAffiliateWebhooks(now = Date.now()): void {
  for (const [userId, dueAt] of jobs()) {
    if (dueAt > now) continue;
    feeAction(userId, 'renew', dueAt);
    jobs().delete(userId);
  }
}
