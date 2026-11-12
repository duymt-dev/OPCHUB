import source from '../../../messages/vi/groups.json';
import { exportCell } from './model';
import type { ExportField, GroupMemberRow } from './types';

/** D-141: export headers and enum text keep their old contract, even in an English dialog. */
export function groupExportContent(rows: readonly GroupMemberRow[], cols: readonly ExportField[]) {
  return {
    head: cols.map((column) => source.export.field[column]),
    table: rows.map((row) =>
      cols.map((column) => exportCell(row, column, source.export.cell) || '—'),
    ),
  };
}
