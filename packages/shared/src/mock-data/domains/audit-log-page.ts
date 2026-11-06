import {
  AUDIT_TAG_LABELS,
  auditCsvTimestamp,
  encodeAuditLogCursor,
  type AuditLogPageQuery,
  type AuditLogRow,
} from '../../api-domains';
import { listSettingsLog } from './settings-log';
import { mockSafeCsv } from './transparency-csv';

const order = (a: AuditLogRow, b: AuditLogRow) =>
  b.at.localeCompare(a.at) || b.id.localeCompare(a.id);
export function mockAuditLogPage(query: AuditLogPageQuery) {
  const rows = listSettingsLog()
    .filter((r) => Date.parse(r.at) <= Date.now())
    .sort(order)
    .filter(
      (r) =>
        !query.cursor ||
        r.at < query.cursor.at ||
        (r.at === query.cursor.at && r.id < query.cursor.id),
    );
  const items = rows.slice(0, query.limit),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > query.limit && last ? encodeAuditLogCursor({ at: last.at, id: last.id }) : null,
  };
}
export function mockAuditCsv() {
  const rows = listSettingsLog()
    .filter((r) => Date.parse(r.at) <= Date.now())
    .sort(order);
  return {
    rows: rows.length,
    csv: mockSafeCsv(
      ['Người thực hiện', 'Thao tác', 'Nhóm', 'Thời gian'],
      rows.map((r) => [r.actorName, r.summary, AUDIT_TAG_LABELS[r.tag], auditCsvTimestamp(r.at)]),
    ),
  };
}
