/** Same BOM, quoting and formula defence as native CSV exports. */
export const mockSafeCsv = (head: string[], rows: (string | number)[][]) =>
  '\ufeff' +
  [
    head.join(','),
    ...rows.map((row) =>
      row
        .map((value) => {
          const text = String(value),
            safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');
