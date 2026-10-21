import { mockDb } from '../store';
import { registrationSnapshotSchema, type RegistrationSnapshot } from './schema';
import { registeredMockProfiles, registrationState } from './state';

export function captureRegistrationSnapshot(): RegistrationSnapshot {
  const state = registrationState();
  const ids = new Set(state.profiles.keys());
  const db = mockDb();
  return registrationSnapshotSchema.parse({
    pending: [...state.pending],
    profiles: registeredMockProfiles(),
    metadata: [...state.metadata],
    mail: state.mail,
    jobs: [...state.jobs],
    memberships: [...db.groupMembers]
      .filter(([id]) => ids.has(id))
      .map(([id, groups]) => [id, [...groups]]),
    requests: db.joinRequests.filter((request) => ids.has(request.userId)),
  });
}

/** Restore data, never replay activation/admission/mail dispatch. */
export function restoreRegistrationSnapshot(input: unknown): void {
  const data = registrationSnapshotSchema.parse(input);
  const state = registrationState();
  const db = mockDb();
  const touched = new Set([
    ...state.profiles.keys(),
    ...data.profiles.map((profile) => profile.id),
  ]);
  const counts = () => {
    const result = new Map<string, number>();
    for (const id of touched)
      for (const [group, status] of db.groupMembers.get(id) ?? []) {
        if (status === 'member') result.set(group, (result.get(group) ?? 0) + 1);
      }
    return result;
  };
  const before = counts();
  for (const id of touched) {
    db.groupMembers.delete(id);
    db.userStatus.delete(id);
  }
  state.pending = new Map(data.pending);
  state.profiles = new Map(data.profiles.map((profile) => [profile.id, profile]));
  state.metadata = new Map(data.metadata);
  state.mail = data.mail;
  state.jobs = new Map(data.jobs);
  for (const [id, groups] of data.memberships) db.groupMembers.set(id, new Map(groups));
  for (const profile of data.profiles) db.userStatus.set(profile.id, profile.status);
  db.joinRequests = [
    ...db.joinRequests.filter((request) => !touched.has(request.userId)),
    ...data.requests,
  ];
  const after = counts();
  for (const group of db.groups) {
    group.memberCount += (after.get(group.id) ?? 0) - (before.get(group.id) ?? 0);
  }
}
