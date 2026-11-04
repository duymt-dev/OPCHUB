import { describe, expect, it } from 'vitest';
import { statusAfterRevoke } from './regional-revoke';

const now = new Date('2026-11-04T00:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe('D-120 statusAfterRevoke', () => {
  it('restores trial while its original deadline remains', () => {
    expect(statusAfterRevoke('trial', days(20), now)).toBe('trial');
  });
  it('restores active more than 30 days before expiry', () => {
    expect(statusAfterRevoke('active', days(31), now)).toBe('active');
  });
  it('restores expiring at or inside the 30-day boundary', () => {
    expect(statusAfterRevoke('active', days(30), now)).toBe('expiring');
    expect(statusAfterRevoke('active', days(10), now)).toBe('expiring');
  });
  it('requires payment with no deadline or an elapsed deadline, including exact expiry', () => {
    expect(statusAfterRevoke(null, null, now)).toBe('pending_payment');
    expect(statusAfterRevoke('trial', days(-1), now)).toBe('pending_payment');
    expect(statusAfterRevoke('active', now, now)).toBe('pending_payment');
  });
});
