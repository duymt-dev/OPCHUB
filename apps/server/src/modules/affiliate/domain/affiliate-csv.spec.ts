import { describe, expect, it } from 'vitest';
import { affiliateCsv } from './affiliate-csv';

describe('Affiliate CSV', () => {
  it('BOM, quote/newline escaping và bảo vệ formula trong dữ liệu người dùng', () => {
    const csv = affiliateCsv(
      ['Tên', 'Tiền'],
      [
        ['=SUM(1,2)', 120000],
        ['  +1', 0],
        ['@cmd', 1],
        ['A "B"\nC', 2],
      ],
    );
    expect(csv).toBe(
      '\uFEFFTên,Tiền\n"\'=SUM(1,2)","120000"\n"\'  +1","0"\n"\'@cmd","1"\n"A ""B""\nC","2"',
    );
  });
});
