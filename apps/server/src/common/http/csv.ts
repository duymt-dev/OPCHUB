/** CSV như prototype: BOM (Excel đọc UTF-8), mọi ô trong ngoặc kép, dòng nối `\n` */
const BOM = String.fromCharCode(0xfeff);

export const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
export const csvSafeText = (value: string) =>
  /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;

export function toCsv(head: readonly string[], rows: readonly (readonly (string | number)[])[]) {
  const lines = rows.map((r) => r.map(csvCell).join(','));
  return `${BOM}${[head.join(','), ...lines].join('\n')}`;
}
