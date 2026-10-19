/** Trần thời gian chờ giữa hai lần thử lại sự kiện outbox (giây) */
export const MAX_BACKOFF_SEC = 300;

/** Thời gian chờ (giây) trước lần thử tiếp theo, `attempts` = số lần đã lỗi (≥ 1): 2, 4, 8 … trần 300 */
export function backoffSec(attempts: number): number {
  const n = Math.max(1, Math.floor(attempts));
  return n >= 9 ? MAX_BACKOFF_SEC : Math.min(2 ** n, MAX_BACKOFF_SEC);
}
