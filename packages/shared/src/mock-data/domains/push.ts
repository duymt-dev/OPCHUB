import { DEFAULT_APP_NOTIFY } from '../../api-domains/app-notify';
import {
  pushPreferencesSchema,
  type PushPreferences,
  type PushRealm,
} from '../../api-domains/push';

const memory = new Map<string, PushPreferences>();
const devices = new Map<string, string>();
export const mockPushConfig = () => ({
  enabled: true,
  vapidPublicKey: '',
  kinds: { ...DEFAULT_APP_NOTIFY.push },
});
const owner = (realm: PushRealm, userId: string) => `${realm}:${userId}`;
export function mockPushPreferences(userId: string): PushPreferences {
  const key = `opchub-push-preferences:${userId}`;
  try {
    const parsed = pushPreferencesSchema.safeParse(
      JSON.parse(sessionStorage.getItem(key) ?? 'null'),
    );
    if (parsed.success) return parsed.data;
  } catch {
    /* Memory fallback when storage is unavailable. */
  }
  return structuredClone(memory.get(userId) ?? DEFAULT_APP_NOTIFY.push);
}
export function saveMockPushPreferences(userId: string, input: PushPreferences) {
  const value = pushPreferencesSchema.parse(input);
  memory.set(userId, value);
  try {
    sessionStorage.setItem(`opchub-push-preferences:${userId}`, JSON.stringify(value));
  } catch {
    /* Memory fallback. */
  }
  return value;
}
export function mockSubscribePush(realm: PushRealm, userId: string, endpoint: string) {
  const key = owner(realm, userId);
  devices.delete(endpoint);
  devices.set(endpoint, key);
  const owned = [...devices.entries()].filter(([, value]) => value === key);
  if (owned.length > 10 && owned[0]) devices.delete(owned[0][0]);
  return { ok: true as const };
}
export function mockUnsubscribePush(realm: PushRealm, userId: string, endpoint: string) {
  if (devices.get(endpoint) === owner(realm, userId)) devices.delete(endpoint);
  return { ok: true as const };
}
export const mockPushDeviceCount = (realm: PushRealm, userId: string) =>
  [...devices.values()].filter((key) => key === owner(realm, userId)).length;
