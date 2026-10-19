import { describe, expect, it } from 'vitest';
import { effectiveFeeStatus, isFeeUsable } from './fee-access';

const NOW = new Date('2026-10-19T03:00:00.000Z');
const minus = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const plus = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe('fee-access (D-57, BUG-018)', () => {
  it('D-57 BUG-018 active quá valid_until → expired', () => {
    const fee = { status: 'active' as const, validUntil: minus(60_000) };
    expect(effectiveFeeStatus(fee, NOW)).toBe('expired');
    expect(isFeeUsable(fee, NOW)).toBe(false);
  });

  it('D-57 BUG-018 expiring quá valid_until → expired; đúng mốc cũng hết hạn', () => {
    expect(effectiveFeeStatus({ status: 'expiring', validUntil: minus(1) }, NOW)).toBe('expired');
    expect(effectiveFeeStatus({ status: 'active', validUntil: NOW }, NOW)).toBe('expired');
  });

  it('D-57 expiring còn hạn → usable', () => {
    const fee = { status: 'expiring' as const, validUntil: plus(3 * 86_400_000) };
    expect(effectiveFeeStatus(fee, NOW)).toBe('expiring');
    expect(isFeeUsable(fee, NOW)).toBe(true);
    expect(isFeeUsable({ status: 'active', validUntil: new Date(plus(1000)) }, NOW)).toBe(true);
  });

  it('D-57 pending_payment không đổi', () => {
    const fee = { status: 'pending_payment' as const, validUntil: minus(60_000) };
    expect(effectiveFeeStatus(fee, NOW)).toBe('pending_payment');
    expect(isFeeUsable(fee, NOW)).toBe(false);
    expect(effectiveFeeStatus({ status: 'expired', validUntil: plus(1000) }, NOW)).toBe('expired');
  });

  it('D-57 valid_until null giữ trạng thái; thiếu phí → không usable', () => {
    expect(effectiveFeeStatus({ status: 'active', validUntil: null }, NOW)).toBe('active');
    expect(isFeeUsable({ status: 'active', validUntil: null }, NOW)).toBe(true);
    expect(isFeeUsable(null, NOW)).toBe(false);
  });
});
