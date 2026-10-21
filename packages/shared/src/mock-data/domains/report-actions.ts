import type { Report, ReportAction } from '../../api-domains';
import { mockDb } from './store';
import { logSetting } from './settings-log';
import { enqueueMockModerationWarning } from './moderation-warning-jobs';
import { conflict, iso, notFound, ok, type MockResult } from './util';

const LABEL: Record<ReportAction, string> = {
  dismiss: 'Bỏ qua',
  hide: 'Ẩn & xóa tin',
  warn: 'Cảnh báo người gửi',
  lock: 'Khóa tài khoản người gửi',
};

/** One synchronous mock transaction: conditional transition, hide/siblings and audit. */
export function actOnMockReport(
  id: string,
  action: ReportAction,
  actorId = 'admin',
): MockResult<Report & { action: ReportAction }> {
  const db = mockDb();
  const report = db.reports.find((row) => row.id === id);
  if (!report) return notFound('Không tìm thấy báo cáo');
  if (report.status !== 'open') return conflict('Báo cáo đã được xử lý');
  const messageId = db.reportMessageIds.get(id);
  const message = [...db.messages.values()].flat().find((row) => row.id === messageId);
  report.status = 'resolved';
  if (action === 'warn') enqueueMockModerationWarning(id);
  if (action === 'hide' && messageId) {
    if (message && !message.hiddenAt) message.hiddenAt = iso(Date.now());
    for (const sibling of db.reports) {
      if (sibling.status === 'open' && db.reportMessageIds.get(sibling.id) === messageId)
        sibling.status = 'resolved';
    }
  }
  const name = message?.isSimulated ? '' : report.senderName;
  logSetting(
    actorId,
    `moderation.${action}`,
    id,
    `${LABEL[action]}: ${name}`.slice(0, 500),
    'moderation',
  );
  return ok({ ...report, action });
}
