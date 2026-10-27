import type { MockDb } from './store-types';

/**
 * Ca kiểm duyệt seed (prototype `REPORT_SEED`) trỏ tới tin `rpt-<ca>` đã gỡ khỏi phòng trước V4:
 * prototype v4 chỉ có các ca này ở Admin, phòng chat không có dòng "đã bị ẩn" (D-89). Native seed
 * đặt `deleted_at` cho các tin này; MSW chỉ giữ liên kết ca → tin, không đưa tin vào phòng.
 */
export function seedMockReportHistory(db: MockDb): void {
  for (const report of db.reports) db.reportMessageIds.set(report.id, `rpt-${report.id}`);
}
