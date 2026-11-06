import { mockDb, type MockDb } from './store';
export const seeded = new WeakSet<MockDb>();
export const isMockAffiliateScenarioSeeded = () => seeded.has(mockDb());
/** Restoring a validated snapshot must not append AF0 rows again on the next request. */
export function restoreMockAffiliateScenarioSeeded(value: boolean): void {
  if (value) seeded.add(mockDb());
  else seeded.delete(mockDb());
}
