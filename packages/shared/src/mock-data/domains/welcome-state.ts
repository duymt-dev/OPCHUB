import { mockDb, type MockDb } from './store';

const seenByDatabase = new WeakMap<MockDb, Set<string>>();
export function mockWelcomeSeen(): Set<string> {
  let seen = seenByDatabase.get(mockDb());
  if (!seen) {
    seen = new Set();
    seenByDatabase.set(mockDb(), seen);
  }
  return seen;
}
export const captureMockWelcomeSeen = () => [...mockWelcomeSeen()];
export function restoreMockWelcomeSeen(users: string[]): void {
  seenByDatabase.set(mockDb(), new Set(users));
}
