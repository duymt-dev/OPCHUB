import { describe, expect, it } from 'vitest';
import { seedManualMockBotScenario } from './bot-demo-scenario';
import { mockDb, resetMockDb } from './store';

describe('REQ-208 explicit manual-only demo precondition', () => {
  it('leaves the normal demo automatic until the explicit fixture is applied', () => {
    resetMockDb();
    const db = mockDb();
    const before = structuredClone(db.botSettings);
    expect(before.autoGenerate).toBe(true);
    seedManualMockBotScenario();
    expect(db.botSettings).toEqual({ ...before, autoGenerate: false });
  });

  it('applies only once so a positive UI enable is not reverted by the next request', () => {
    resetMockDb();
    seedManualMockBotScenario();
    mockDb().botSettings.autoGenerate = true;
    seedManualMockBotScenario();
    expect(mockDb().botSettings.autoGenerate).toBe(true);
  });

  it('reapplies for a new store without leaking a previous test setting', () => {
    resetMockDb();
    seedManualMockBotScenario();
    resetMockDb();
    expect(mockDb().botSettings.autoGenerate).toBe(true);
    seedManualMockBotScenario();
    expect(mockDb().botSettings.autoGenerate).toBe(false);
  });
});
