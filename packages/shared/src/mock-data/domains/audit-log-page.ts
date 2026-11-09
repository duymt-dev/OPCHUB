import {
  AUDIT_TAG_LABELS,
  auditCsvTimestamp,
  encodeAuditLogCursor,
  type AuditLogPageQuery,
  type AuditLogRow,
  type AuditLogFilters,
} from '../../api-domains';
import { listSettingsLog } from './settings-log';
import { mockSafeCsv } from './transparency-csv';

const order = (a: AuditLogRow, b: AuditLogRow) =>
  b.at.localeCompare(a.at) || b.id.localeCompare(a.id);
function filteredRows(filters: AuditLogFilters) {
  const now = Date.now();
  const from = Math.max(now - 90 * 86_400_000, filters.from ? Date.parse(filters.from) : 0);
  const to = Math.min(now, filters.to ? Date.parse(filters.to) : now);
  return listSettingsLog()
    .filter(
      (r) =>
        Date.parse(r.at) >= from &&
        Date.parse(r.at) <= to &&
        (!filters.tag || r.tag === filters.tag) &&
        (!filters.actorId ||
          (filters.actorId === 'system' ? r.actorId === null : r.actorId === filters.actorId)),
    )
    .sort(order);
}
export function mockAuditLogPage(query: AuditLogPageQuery) {
  const rows = filteredRows(query).filter(
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
export function mockAuditCsv(filters: AuditLogFilters = {}) {
  const rows = filteredRows(filters);
  return {
    rows: rows.length,
    csv: mockSafeCsv(
      ['Người thực hiện', 'Thao tác', 'Nhóm', 'Thời gian'],
      rows.map((r) => [r.actorName, r.summary, AUDIT_TAG_LABELS[r.tag], auditCsvTimestamp(r.at)]),
    ),
  };
}
