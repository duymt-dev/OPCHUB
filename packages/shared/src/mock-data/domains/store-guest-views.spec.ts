import { beforeEach, describe, it, expect } from 'vitest';
import { mockStores, myMockStoreDashboard } from './stores';
import { resetMockDb } from './store';
import { recordMockGuestView } from './store-guest-views';
beforeEach(() => resetMockDb());
describe('REQ-627 B15 mock guest metrics follow real contract', () => {
  it('REQ-627 deduplicates30 minutes and never alters member-view counters', async () => {
    const store = mockStores()[0];
    if (!store) throw new Error('Missing fixture');
    const before = store.views,
      now = Date.now();
    for (const delta of [0, 5, 10])
      await recordMockGuestView(store, 'Mozilla guest-820', undefined, now + delta * 60_000);
    const dashboard = myMockStoreDashboard(store.ownerId, now);
    if (!dashboard.ok) throw new Error('Missing owner dashboard');
    expect(dashboard.data.guestViews7d).toBe(1);
    expect(store.views).toBe(before);
    await recordMockGuestView(store, 'Mozilla guest-820', undefined, now + 31 * 60_000);
    const after = myMockStoreDashboard(store.ownerId, now + 31 * 60_000);
    if (!after.ok) throw new Error('Missing owner dashboard');
    expect(after.data.guestViews7d).toBe(2);
  });
  it('REQ-627 excludes owner, crawler, headless and empty user agents', async () => {
    const store = mockStores()[0];
    if (!store) throw new Error('Missing fixture');
    await recordMockGuestView(store, 'Mozilla owner', store.ownerId);
    for (const ua of ['Googlebot', 'HeadlessChrome', '']) await recordMockGuestView(store, ua);
    const dashboard = myMockStoreDashboard(store.ownerId);
    if (!dashboard.ok) throw new Error('Missing owner dashboard');
    expect(dashboard.data.guestViews7d).toBe(0);
  });
});
