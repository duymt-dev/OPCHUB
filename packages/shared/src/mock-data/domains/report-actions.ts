import type { LockDays, Report, ReportAction } from '../../api-domains';
import { mockDb } from './store';
import { logSetting } from './settings-log';
import { enqueueMockModerationWarning } from './moderation-warning-jobs';
import { lockMockReportSender } from './moderation-lock';
import { restoreMock, withMockViolations } from './moderation-violations';
import { conflict, iso, notFound, ok, type MockResult } from './util';

const LABEL: Record<ReportAction, string> = {
  dismiss: 'Bỏ qua',
  hide: 'Ẩn & xóa tin',
  warn: 'Cảnh báo người gửi',
  lock: 'Khóa tài khoản người gửi',
  restore: 'Khôi phục tin',
};

/** Đóng mọi ca mở của cùng tin (ẩn / khôi phục áp cho cả tin) */
function closeSiblings(messageId: string | undefined) {
  const db = mockDb();
  if (!messageId) return;
  for (const sibling of db.reports) {
    if (sibling.status === 'open' && db.reportMessageIds.get(sibling.id) === messageId)
      sibling.status = 'resolved';
  }
}

/**
 * One synchronous mock transaction: conditional transition, hide/siblings and audit. V4-612:
 * `restore` / `dismiss` = Khôi phục tin (mở khoá tự động nếu < 2); `lock` nhận `days`.
 */
export function actOnMockReport(
  id: string,
  action: ReportAction,
  actorId = 'admin',
  note: string | null = null,
  days?: LockDays,
): MockResult<Report & { action: ReportAction; unlocked: boolean }> {
  const db = mockDb();
  const report = db.reports.find((row) => row.id === id);
  if (!report) return notFound('Không tìm thấy báo cáo');
  if (report.status !== 'open') return conflict('Báo cáo đã được xử lý');
  const messageId = db.reportMessageIds.get(id);
  const message = [...db.messages.values()].flat().find((row) => row.id === messageId);
  report.status = 'resolved';
  let unlocked = false;
  if (action === 'warn') enqueueMockModerationWarning(id);
  if (action === 'hide' && messageId) {
    if (message && !message.hiddenAt) message.hiddenAt = iso(Date.now());
    closeSiblings(messageId);
  }
  if (action === 'restore' || action === 'dismiss') {
    closeSiblings(messageId);
    unlocked = restoreMock(id, actorId);
  }
  const name = message?.isSimulated ? '' : report.senderName;
  logSetting(
    actorId,
    `moderation.${action}`,
    id,
    `${LABEL[action]}: ${name}`.slice(0, 500),
    'moderation',
  );
  if (action === 'lock') lockMockReportSender(id, actorId, note, days);
  return ok({ ...withMockViolations(report), action, unlocked });
}
