import { LIVE_FEED_MAX, type LiveActivity } from '../../api-domains';
import { mockDb, type MockDb } from './store';

/**
 * Hoạt động trực tiếp của phiên MSW (NA-24): gửi tin / tham gia nhóm ghi vào đây; `GET /dashboard/live`
 * ghép lên đầu danh sách, tối đa 50. WeakMap theo MockDb → `resetMockDb()` tự xoá.
 */
const feeds = new WeakMap<MockDb, LiveActivity[]>();

export function liveFeed(): LiveActivity[] {
  const db = mockDb();
  let f = feeds.get(db);
  if (!f) {
    f = [];
    feeds.set(db, f);
  }
  return f;
}

export function recordLive(a: Omit<LiveActivity, 'id'>): void {
  const f = liveFeed();
  f.unshift({ ...a, id: `s${f.length}-${a.at}` });
  f.length = Math.min(f.length, LIVE_FEED_MAX);
}
