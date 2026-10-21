import { describe, expect, it } from 'vitest';
import { bundleOf, intlLocaleOf } from './locales';

describe('locales (D-65)', () => {
  it('mã → bộ dịch: en-SG dùng en, ms-BN dùng ms, lạ/thiếu → vi', () => {
    expect(bundleOf('th')).toBe('th');
    expect(bundleOf('en-SG')).toBe('en');
    expect(bundleOf('ms-BN')).toBe('ms');
    expect(bundleOf('xx')).toBe('vi');
    expect(bundleOf(undefined)).toBe('vi');
  });

  it('BCP 47 cho Intl: en → 1,234; vi → 1.234', () => {
    expect((1234).toLocaleString(intlLocaleOf('en'))).toBe('1,234');
    expect((1234).toLocaleString(intlLocaleOf('vi'))).toBe('1.234');
    expect(intlLocaleOf('nope')).toBe('vi-VN');
  });
});
