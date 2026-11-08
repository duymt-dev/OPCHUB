/** In-memory fake analytics only; never persists IP or raw UA, never affects member view KPIs. */
interface GuestState {
  days: Map<string, number>;
  claims: Map<string, number>;
}
const states = new WeakMap<object, GuestState>();
const day = (now: number) => new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
export async function recordMockGuestView(
  store: { ownerId: string },
  ua: string,
  viewerId?: string,
  now = Date.now(),
) {
  if (
    !ua ||
    /googlebot|bingbot|facebookexternalhit|zalo|crawler|spider|bot|headless/i.test(ua) ||
    store.ownerId === viewerId
  )
    return;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`mock-820:${ua}`));
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const state = states.get(store) ?? {
    days: new Map<string, number>(),
    claims: new Map<string, number>(),
  };
  states.set(store, state);
  if ((state.claims.get(key) ?? 0) > now) return;
  state.claims.set(key, now + 30 * 60_000);
  state.days.set(day(now), (state.days.get(day(now)) ?? 0) + 1);
}
export function mockGuestViews7d(store: object, now = Date.now()) {
  const state = states.get(store);
  if (!state) return 0;
  return Array.from({ length: 7 }, (_, i) => state.days.get(day(now - i * 86_400_000)) ?? 0).reduce(
    (a, b) => a + b,
    0,
  );
}
