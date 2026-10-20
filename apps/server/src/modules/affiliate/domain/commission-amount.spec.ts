import { describe, expect, it } from 'vitest';
import { commissionAmount } from './commission-amount';

describe('số tiền hoa hồng (D-53)', () => {
  it('D-53 600.000 × 20% = 120.000', () => {
    expect(commissionAmount(600_000, 20)).toBe(120_000);
  });

  it('D-53 làm tròn xuống đồng', () => {
    expect(commissionAmount(99_999, 33)).toBe(32_999);
    expect(Number.isInteger(commissionAmount(600_001, 7))).toBe(true);
  });
});
