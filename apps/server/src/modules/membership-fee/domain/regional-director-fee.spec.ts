import { describe, expect, it } from 'vitest';
import { feeStatusAfterRevocation } from './regional-director-fee';

const now = new Date('2026-10-30T00:00:00Z');
const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000);

describe('BR-462 TC-462 original fee expiry after director revocation', () => {
  it('D-120 restores remaining trial rather than granting a paid subscription', () => {
    expect(feeStatusAfterRevocation({ status: 'trial', validUntil: day(10) }, now)).toBe('trial');
  });

  it.each(['active', 'expiring'] as const)(
    'restores %s according to actual remaining time',
    (status) => {
      expect(feeStatusAfterRevocation({ status, validUntil: day(31) }, now)).toBe('active');
      expect(feeStatusAfterRevocation({ status, validUntil: day(30) }, now)).toBe('expiring');
      expect(feeStatusAfterRevocation({ status, validUntil: day(1) }, now)).toBe('expiring');
    },
  );

  it.each(['trial', 'active', 'expiring', 'expired', 'pending_payment'] as const)(
    'AT-GDV02 requires payment when original %s term is gone, without restarting trial',
    (status) => {
      expect(feeStatusAfterRevocation({ status, validUntil: null }, now)).toBe('pending_payment');
      expect(feeStatusAfterRevocation({ status, validUntil: day(-1) }, now)).toBe(
        'pending_payment',
      );
      expect(feeStatusAfterRevocation({ status, validUntil: now }, now)).toBe('pending_payment');
    },
  );

  it('D-120 does not promote unpaid or expired legacy data to paid status', () => {
    expect(feeStatusAfterRevocation({ status: 'pending_payment', validUntil: day(5) }, now)).toBe(
      'pending_payment',
    );
    expect(feeStatusAfterRevocation({ status: 'expired', validUntil: day(5) }, now)).toBe(
      'pending_payment',
    );
  });

  it('BR-462 does not mutate or extend the original expiry', () => {
    const validUntil = day(10);
    const fee = { status: 'active' as const, validUntil };
    const original = validUntil.getTime();
    feeStatusAfterRevocation(fee, now);
    expect(fee.validUntil).toBe(validUntil);
    expect(validUntil.getTime()).toBe(original);
    expect(fee.status).toBe('active');
  });

  it('fails closed for a malformed persisted expiry', () => {
    expect(
      feeStatusAfterRevocation({ status: 'active', validUntil: new Date('invalid') }, now),
    ).toBe('pending_payment');
  });
});
