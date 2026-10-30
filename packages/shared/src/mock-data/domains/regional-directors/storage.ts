import { DIRECTOR_REGIONS, type DirectorRegion } from '../../../api-domains';
import { DIRECTOR_DEMO, provinces } from '../../../fixtures';
import type { MockDb } from '../store-types';
import { mockDirectorSnapshotSchema, type MockDirectorSnapshot } from './schema';

export const directorStates = new WeakMap<MockDb, MockDirectorSnapshot>();
const CATALOG_REGION: Record<DirectorRegion, string> = {
  north: 'Miền Bắc',
  central: 'Miền Trung',
  south: 'Miền Nam',
};

/** Also used to restore legacy non-exempt snapshots: never appoint on restore. */
export function emptyMockDirectorState(): MockDirectorSnapshot {
  return {
    config: {
      slots: DIRECTOR_REGIONS.map((region) => ({
        region,
        version: 1,
        provinces: provinces
          .filter(([, label]) => label === CATALOG_REGION[region])
          .map(([name]) => name),
        bank: null,
        incumbent: null,
        affiliateCount: 0,
      })),
      unassignedProvinces: [],
    },
    previousFees: [],
    history: [],
    mail: [],
    mailJobs: [],
  };
}

/** Demo initialization only, not a business appointment: no mail/history/audit effects. */
export function initializeMockDirectors(db: MockDb): MockDirectorSnapshot {
  const existing = directorStates.get(db);
  if (existing) return existing;
  const state = emptyMockDirectorState();
  for (const demo of DIRECTOR_DEMO) {
    const slot = state.config.slots.find((row) => row.region === demo.region);
    const fee = db.fees.find((row) => row.userId === demo.userId);
    if (!slot || !fee || fee.status === 'regional_director')
      throw new Error('Incomplete director demo fee');
    state.previousFees.push({ userId: fee.userId, status: fee.status, validUntil: fee.validUntil });
    slot.incumbent = {
      id: fee.userId,
      memberCode: fee.memberCode,
      fullName: fee.fullName,
      email: fee.email,
      appointedAt: demo.appointedAt,
    };
    slot.bank = { ...demo.bank };
  }
  const parsed = mockDirectorSnapshotSchema.parse(state);
  for (const fee of db.fees) {
    if (DIRECTOR_DEMO.some((demo) => demo.userId === fee.userId)) fee.status = 'regional_director';
  }
  directorStates.set(db, parsed);
  return parsed;
}
