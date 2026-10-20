import { describe, expect, it } from 'vitest';
import { AFFILIATE_CODE_RE, affiliateCode, stripName } from './affiliate-code';

describe('mã đại lý (AF-R01)', () => {
  it('REQ-301 sinh mã từ tên có dấu: từ cuối ≤ 6 ký tự + OPC + 2 số', () => {
    const c = affiliateCode('Nguyễn Văn An');
    expect(c).toMatch(/^ANOPC\d{2}$/);
    expect(c).toMatch(AFFILIATE_CODE_RE);
    expect(affiliateCode('Trần Quốc Bảo')).toMatch(/^BAOOPC\d{2}$/);
    expect(affiliateCode('Lê Thị Phương')).toMatch(/^PHUONGOPC\d{2}$/);
  });

  it('REQ-301 đ → D, bỏ ký tự lạ, tên trống → OPC', () => {
    expect(stripName('Đỗ Hải Yến')).toBe('DO HAI YEN');
    expect(affiliateCode('Hoàng Đức')).toMatch(/^DUCOPC\d{2}$/);
    expect(affiliateCode('')).toMatch(/^OPCOPC\d{2}$/);
  });

  it('REQ-301 cùng tên cho cùng mã; thử lại đổi hậu tố, quá 20 lần dùng 3 số', () => {
    expect(affiliateCode('Nguyễn Văn An')).toBe(affiliateCode('Nguyễn Văn An'));
    expect(affiliateCode('Nguyễn Văn An', 1)).not.toBe(affiliateCode('Nguyễn Văn An'));
    expect(affiliateCode('Nguyễn Văn An', 20)).toMatch(/^ANOPC\d{3}$/);
  });
});
