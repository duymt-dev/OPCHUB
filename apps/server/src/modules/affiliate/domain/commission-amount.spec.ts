import { describe, expect, it } from 'vitest';
import { commissionAmount } from './commission-amount';

describe('số tiền hoa hồng (D-110)', () => {
  it('600.000 × 20% = 120.000', () => {
    expect(commissionAmount(600_000, 20)).toBe(120_000);
  });

  it('D-110 làm tròn đến đồng (thay làm tròn xuống của D-53)', () => {
    // 99.999 × 33% = 32.999,67 → 33.000
    expect(commissionAmount(99_999, 33)).toBe(33_000);
    // 99.998 × 33% = 32.999,34 → 32.999
    expect(commissionAmount(99_998, 33)).toBe(32_999);
    expect(Number.isInteger(commissionAmount(600_001, 7))).toBe(true);
  });
});
