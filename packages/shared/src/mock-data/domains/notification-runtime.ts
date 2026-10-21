import type { Notification } from '../../api-domains';
import type { MockDb } from './store-types';

const liveIds = new WeakMap<MockDb, Set<string>>();
export const isLiveMockNotification = (db: MockDb, id: string) => liveIds.get(db)?.has(id) ?? false;

/** Runtime publication boundary: stable-ID dedupe, real timestamp, newest50 per recipient. */
export function publishMockNotification(
  db: MockDb,
  userId: string,
  notification: Notification,
): boolean {
  if ([...db.notifications.values()].some((rows) => rows.some((row) => row.id === notification.id)))
    return false;
  let ids = liveIds.get(db);
  if (!ids) {
    ids = new Set();
    liveIds.set(db, ids);
  }
  ids.add(notification.id);
  db.notifications.set(
    userId,
    [notification, ...(db.notifications.get(userId) ?? [])]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))
      .slice(0, 50),
  );
  return true;
}
