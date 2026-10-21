import { mockReportSource } from './report-context';
import { setMockMemberStatus } from './member-lifecycle';

/** Native account lock follows resolution; null/already-locked senders add no transition. */
export function lockMockReportSender(reportId: string, actorId: string, note: string | null) {
  const source = mockReportSource(reportId);
  if (source?.userId)
    setMockMemberStatus(source.userId, 'locked', actorId, note ?? 'Vi phạm nội quy chat');
}
