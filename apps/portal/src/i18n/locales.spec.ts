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

describe('fmtCompact / fmtInt theo locale (D-65)', () => {
  it('vi giữ tỷ/triệu; en dạng gọn, dấu phẩy nghìn', async () => {
    const { fmtCompact, fmtInt, setFormatLocale } = await import('./format');
    setFormatLocale('vi');
    expect(fmtCompact(1_500_000_000)).toBe('1,5 tỷ');
    expect(fmtCompact(100_000_000)).toBe('100 triệu');
    expect(fmtInt(1234)).toBe('1.234');
    setFormatLocale('en');
    expect(fmtCompact(2_000_000_000)).toBe('2bn');
    expect(fmtInt(1234)).toBe('1,234');
    setFormatLocale('vi');
  });
});

describe('eventDay theo locale (D-65)', () => {
  it('vi giữ chuỗi server; en dựng thứ từ startsAt theo giờ VN', async () => {
    const { eventDay, setFormatLocale } = await import('./format');
    // 22/10/2026 19:30 giờ VN = 12:30 UTC, thứ Năm
    const at = '2026-10-22T12:30:00.000Z';
    setFormatLocale('vi');
    expect(eventDay(at, 'T5, 22/10')).toEqual({ dow: 'T5', dnum: '22', day: 'T5, 22/10' });
    setFormatLocale('en');
    expect(eventDay(at, 'T5, 22/10')).toEqual({ dow: 'Thu', dnum: '22', day: 'Thu, 22/10' });
    setFormatLocale('vi');
  });
});
