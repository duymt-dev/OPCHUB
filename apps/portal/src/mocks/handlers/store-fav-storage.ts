import { z } from 'zod';

/** Mock backend durability for store favorites (D-89, P-105) across page reloads, isolated to this
 * browser tab/test context — the native API keeps them in `store_favorites`.
 */
const key = (userId: string) => `opchub-msw-store-fav:${userId}`;
const idsSchema = z.array(z.string().max(64)).max(200);

export function readMockStoreFavs(userId: string): string[] {
  try {
    const value = sessionStorage.getItem(key(userId));
    if (!value) return [];
    const parsed = idsSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function persistMockStoreFav(userId: string, storeId: string, on: boolean): void {
  try {
    const ids = new Set(readMockStoreFavs(userId));
    if (on) ids.add(storeId);
    else ids.delete(storeId);
    sessionStorage.setItem(key(userId), JSON.stringify([...ids]));
  } catch {
    /* Storage may be denied: in-memory handler state still works. */
  }
}
