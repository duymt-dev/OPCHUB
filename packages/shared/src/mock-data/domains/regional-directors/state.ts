import { mockDb } from '../store';
import { mockDirectorSnapshotSchema, type MockDirectorSnapshot } from './schema';
import { directorStates, emptyMockDirectorState, initializeMockDirectors } from './storage';

export function mockDirectorState(): MockDirectorSnapshot {
  return initializeMockDirectors(mockDb());
}

export const captureMockDirectorSnapshot = (): MockDirectorSnapshot =>
  mockDirectorSnapshotSchema.parse(mockDirectorState());

/** Restore is replacement only: no appointment, audit or mail dispatch is replayed. */
export function restoreMockDirectorSnapshot(input?: MockDirectorSnapshot): void {
  directorStates.set(mockDb(), mockDirectorSnapshotSchema.parse(input ?? emptyMockDirectorState()));
}
