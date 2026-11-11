import { describe, expect, it } from 'vitest';
import { rowActions, txnBadge, vnd, vnDate, vnDateTime } from './model';

describe('D-141 AC824-08 fee display formats, not business values', () => {
  it('keeps existing Vietnamese date, timestamp and integer VND output', () => {
    const iso = '2026-12-31T17:00:00.000Z';
    expect(vnDate(iso)).toBe('01/01/2027');
    expect(vnDateTime(iso)).toBe('00:00 01/01/2027');
    expect(vnd(1234567)).toBe('1.234.567đ');
    expect(vnDate(null)).toBe('—');
  });

  it('formats the same amount in English without a rate or unit conversion', () => {
    expect(vnd(1234567, 'en')).toBe('₫1,234,567');
    expect(vnd(0, 'en')).toBe('₫0');
    expect(vnd(-1234, 'en')).toBe('-₫1,234');
  });

  it('uses the VN calendar day and Gregorian year for Chinese/Thai display', () => {
    const iso = '2026-12-31T17:00:00.000Z';
    expect(vnDate(iso, 'zh')).toBe('2027/01/01');
    expect(vnDate(iso, 'th')).toBe('01/01/2027');
    expect(vnDateTime(iso, 'en')).toBe('01/01/2027, 00:00');
  });

  it('does not change fee eligibility, badges or canonical values', () => {
    expect(rowActions('trial')).toEqual({ collect: false, renew: false, remind: true });
    expect(rowActions('active')).toEqual({ collect: false, renew: true, remind: false });
    expect(txnBadge(12, 9)).toBe('9+');
    expect(txnBadge(4, 9)).toBe('4');
  });
});
