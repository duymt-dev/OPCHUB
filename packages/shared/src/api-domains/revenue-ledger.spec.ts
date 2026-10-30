import { describe, expect, it } from 'vitest';
import {
  revenueBalanceSchema,
  revenueLedgerQuerySchema,
  revenueMonthsQuerySchema,
} from './revenue-ledger';

describe('REQ-617 Admin ledger contracts', () => {
  it('preserves aggregate precision and rejects lossy numeric or noncanonical VND', () => {
    const balance = {
      receiptCount: '10000000',
      received: '9007199254740993',
      allocated: '4000000000000000',
      paid: '0',
      due: '4000000000000000',
      mediaSoft: '5007199254740993',
    };
    expect(revenueBalanceSchema.parse(balance)).toEqual(balance);
    for (const due of [0, -1, '01', '-1', '1.5', '1e9']) {
      expect(revenueBalanceSchema.safeParse({ ...balance, due }).success).toBe(false);
    }
  });

  it('requires paired ledger cursor, bounded page size and no hidden query fields', () => {
    expect(revenueLedgerQuerySchema.parse({})).toEqual({ size: 8 });
    for (const q of [
      { beforeAt: '2026-01-01T00:00:00Z' },
      { beforeId: '019b76da-a800-7000-8000-000000000001' },
      { size: 101 },
      { size: 0 },
      { directorId: 'other' },
    ])
      expect(revenueLedgerQuerySchema.safeParse(q).success).toBe(false);
  });

  it('validates monthly keysets and refuses invalid calendar months', () => {
    expect(revenueMonthsQuerySchema.parse({ beforeMonth: '2026-09', size: '2' })).toEqual({
      beforeMonth: '2026-09',
      size: 2,
    });
    expect(revenueMonthsQuerySchema.safeParse({ beforeMonth: '2026-13' }).success).toBe(false);
  });
});
