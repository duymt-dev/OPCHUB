import { toCsv } from '@/common/http/csv';

/** Tránh công thức Excel trong các ô tên/email người dùng nhập. */
export const affiliateCsv = (head: string[], rows: (string | number)[][]) =>
  toCsv(
    head,
    rows.map((row) =>
      row.map((value) =>
        typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value,
      ),
    ),
  );
