import { describe, expect, it } from 'vitest';
import { businessVerification, normalizeName, phoneToE164 } from './register.mapper';

describe('phoneToE164', () => {
  it.each([
    [{ country: 'vn', number: '0912 345 678' }, '+84912345678'],
    [{ country: 'vn', number: '912345678' }, '+84912345678'],
    [{ country: 'sg', number: '8123 4567' }, '+6581234567'],
    [{ country: 'th', number: '+66 81 234 5678' }, '+66812345678'],
  ])('%o → %s', (p, e164) => {
    expect(phoneToE164(p)).toBe(e164);
  });

  it('số trống → null (SĐT không bắt buộc)', () => {
    expect(phoneToE164({ country: 'vn', number: '  ' })).toBeNull();
  });
});

describe('D-40 xác minh DN theo MST', () => {
  it('so không dấu, không phân biệt hoa, gộp khoảng trắng', () => {
    expect(normalizeName('  CÔNG TY TNHH  Đông Á ')).toBe('cong ty tnhh dong a');
  });

  it('khớp → verified; khác hoặc không tra được → pending', () => {
    const found = 'Công ty TNHH Giải pháp MediaSoft';
    expect(businessVerification('CONG TY TNHH GIAI PHAP MEDIASOFT', found)).toBe('verified');
    expect(businessVerification('Công ty khác', found)).toBe('pending');
    expect(businessVerification('Bất kỳ', null)).toBe('pending');
  });
});
