import { KEYWORD_REASON } from '@opchub/shared';
import { REPORT_REASONS, type Report } from '@opchub/shared/api-domains';
import type { ReportRow } from '../repositories/report.repository';

type Reason = (typeof REPORT_REASONS)[number];

const isReason = (r: string): r is Reason => (REPORT_REASONS as readonly string[]).includes(r);

/**
 * Ca từ khoá không có lý do người dùng chọn → suy theo từ khoá (hiển thị nhãn ở Admin);
 * mặc định `other`. Bảng nhỏ, cố định theo 7 từ khoá seed.
 */

export function toReport(r: ReportRow): Report {
  const reason =
    r.source === 'auto'
      ? (KEYWORD_REASON[r.hit.toLocaleLowerCase('vi')] ?? (isReason(r.reason) ? r.reason : 'other'))
      : isReason(r.reason)
        ? r.reason
        : 'other';
  return {
    id: r.id,
    senderName: r.sender_name ?? 'Hệ thống',
    groupName: r.group_name,
    body: r.body,
    hit: r.hit,
    reason,
    source: r.source,
    reporterCount: r.reporter_count,
    status: r.status,
    createdAt: r.created_at.toISOString(),
  };
}
