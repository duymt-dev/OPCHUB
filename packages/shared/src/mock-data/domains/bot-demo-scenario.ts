import { mockDb, type MockDb } from './store';

const seeded = new WeakSet<MockDb>();
export const isManualMockBotScenarioSeeded = () => seeded.has(mockDb());
export function restoreManualMockBotScenarioSeeded(value: boolean): void {
  if (value) seeded.add(mockDb());
  else seeded.delete(mockDb());
}

/** Explicit equivalent of seed:demo --bot-manual; never changes the default demo. */
export function seedManualMockBotScenario(): void {
  const db = mockDb();
  if (seeded.has(db)) return;
  db.botSettings.autoGenerate = false;
  seeded.add(db);
}
