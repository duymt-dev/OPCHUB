import { z } from 'zod';
import type { UserStatus } from '../../enums';
import { mockDb } from './store';
import type { MockDb } from './store-types';

const epochs = new WeakMap<MockDb, Map<string, number>>();
function versions() {
  const db = mockDb();
  let value = epochs.get(db);
  if (!value) {
    value = new Map();
    epochs.set(db, value);
  }
  return value;
}
export const mockMemberEpoch = (userId: string) => versions().get(userId) ?? 0;
export const mockMemberStatus = (userId: string, fallback: UserStatus = 'active') =>
  mockDb().userStatus.get(userId) ?? fallback;
export function registerMockSessionMember(userId: string, status: UserStatus) {
  if (!mockDb().userStatus.has(userId)) mockDb().userStatus.set(userId, status);
}
export function revokeMockMemberSessions(userId: string) {
  versions().set(userId, mockMemberEpoch(userId) + 1);
}
export function mockMemberAccessToken(userId: string) {
  const epoch = mockMemberEpoch(userId);
  return `mock.${userId}${epoch ? `~${epoch}` : ''}`;
}

const tokenSchema = z.string().regex(/^mock\.[^~]+(?:~\d+)?$/);
const epochSchema = z.coerce.number().int().nonnegative();
/** Only fake bearer identities, never JWT/credentials. */
export function parseMockMemberToken(input: string) {
  if (!tokenSchema.safeParse(input).success) return null;
  const match = /^mock\.([^~]+)(?:~(\d+))?$/.exec(input);
  const userId = match?.[1];
  const epoch = epochSchema.safeParse(match?.[2] ?? '0');
  return userId && epoch.success ? { userId, epoch: epoch.data } : null;
}
