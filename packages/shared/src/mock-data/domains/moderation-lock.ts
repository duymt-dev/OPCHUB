import { members } from '../../fixtures';
import { VIOLATION_LOCK_REASON } from '../../api-domains';
import { mockDb } from './store';
import { lockMockMember, mockModerationSettings } from './moderation-violations';
import { mockReportSource } from './report-context';

/**
 * Native account lock follows resolution; null/already-locked senders add no transition.
 * V4-612: khoá thủ công N ngày (mặc định "Thời gian khóa").
 */
export function lockMockReportSender(
  reportId: string,
  actorId: string,
  note: string | null,
  days?: number,
) {
  const source = mockReportSource(reportId);
  const report = mockDb().reports.find((r) => r.id === reportId);
  // Ca seed không có nguồn đã ghi → tra theo tên; ca có nguồn (kể cả persona = null) giữ nguyên
  const userId = source
    ? source.userId
    : (members.find((m) => m.name === report?.senderName)?.id ?? null);
  if (userId)
    lockMockMember(
      userId,
      'manual',
      days ?? mockModerationSettings().autoLockDays,
      actorId,
      note ?? VIOLATION_LOCK_REASON,
    );
}
