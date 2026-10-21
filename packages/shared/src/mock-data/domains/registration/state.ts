import type { AdminMember, MailLogRow } from '../../../api-domains';
import { mockDb, type MockDb } from '../store';
import type { PendingRegistration, RegistrationMetadata } from './schema';

interface RegistrationState {
  pending: Map<string, PendingRegistration>;
  profiles: Map<string, AdminMember>;
  metadata: Map<string, RegistrationMetadata>;
  mail: MailLogRow[];
  jobs: Map<string, number>;
}
const states = new WeakMap<MockDb, RegistrationState>();
export function registrationState(): RegistrationState {
  const db = mockDb();
  let state = states.get(db);
  if (!state) {
    state = {
      pending: new Map(),
      profiles: new Map(),
      metadata: new Map(),
      mail: [],
      jobs: new Map(),
    };
    states.set(db, state);
  }
  return state;
}
export const normalizeRegistrationEmail = (email: string) => email.trim().toLowerCase();

export function registeredMockProfiles(): AdminMember[] {
  const db = mockDb();
  return [...registrationState().profiles.values()].map((profile) => ({
    ...profile,
    status: db.userStatus.get(profile.id) ?? profile.status,
    groupIds: [...(db.groupMembers.get(profile.id) ?? [])]
      .filter(([, status]) => status === 'member')
      .map(([id]) => id),
  }));
}
export const registeredMockEmailTaken = (email: string) =>
  registeredMockProfiles().some((row) => row.email === normalizeRegistrationEmail(email));
