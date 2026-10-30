import { DIRECTOR_REGIONS, type DirectorRegion } from '../../../api-domains';
import { provinces } from '../../../fixtures';
import { mockDb, type MockDb } from '../store';
import { mockDirectorSnapshotSchema, type MockDirectorSnapshot } from './schema';

const states = new WeakMap<MockDb, MockDirectorSnapshot>();
const CATALOG_REGION: Record<DirectorRegion, string> = {
  north: 'Miền Bắc',
  central: 'Miền Trung',
  south: 'Miền Nam',
};

function initialState(): MockDirectorSnapshot {
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
      unassignedProvinces: provinces
        .filter(([, label]) => !Object.values(CATALOG_REGION).includes(label))
        .map(([name]) => name),
    },
    previousFees: [],
    history: [],
    mail: [],
    mailJobs: [],
  };
}

export function mockDirectorState(): MockDirectorSnapshot {
  const db = mockDb();
  let state = states.get(db);
  if (!state) {
    state = mockDirectorSnapshotSchema.parse(initialState());
    states.set(db, state);
  }
  return state;
}

export const captureMockDirectorSnapshot = (): MockDirectorSnapshot =>
  mockDirectorSnapshotSchema.parse(mockDirectorState());

/** Restore is replacement only: no appointment, audit or mail dispatch is replayed. */
export function restoreMockDirectorSnapshot(input?: MockDirectorSnapshot): void {
  states.set(mockDb(), mockDirectorSnapshotSchema.parse(input ?? initialState()));
}
