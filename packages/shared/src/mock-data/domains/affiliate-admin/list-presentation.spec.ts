import { describe, expect, it, vi } from 'vitest';
import {
  affiliateAdminListRowSchema,
  affiliateAdminRowSchema,
  type AffiliateAdminRow,
} from '../../../api-domains';
import { mockAffiliateListPresentation } from './list-presentation';
import { mockAdminAffiliates } from './read';
import { seedMockAffiliateScenario } from '../affiliate-demo';
import { resetMockDb } from '../store';

const row: AffiliateAdminRow = {
  id: 'a1',
  userId: 'u1',
  name: 'Agent',
  email: 'agent@example.invalid',
  code: 'AGENT1',
  rate: 30,
  status: 'active',
  source: 'auto',
  customers: 2,
  revenue: 1200000,
  balance: 180000,
  paid: 120000,
  monthStatus: 'recorded',
  hasBank: true,
};
const bank = { bankName: 'ACB', bankNo: '24681357', bankHolder: 'LE THU HA' } as const;
const agents = new Map([['a1', { bank }]]);

describe('REQ-312 V2Q-178 additive list presentation contract', () => {
  it('wires the actual AF0 provider to live bank, lifetime and selected-month values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T02:00:00Z'));
    try {
      resetMockDb();
      seedMockAffiliateScenario();
      const result = mockAdminAffiliates({ q: 'HAOPC', month: '2026-09', page: 1, size: 1 });
      const item = affiliateAdminListRowSchema.parse(result.items[0]);
      expect(item).toMatchObject({
        bank,
        customers: 6,
        revenue: 3600000,
        balance: 0,
        paid: 900000,
        lifetime: { customers: 13, revenue: 7800000 },
        period: {
          month: '2026-09',
          customers: 6,
          commission: 900000,
          payable: 0,
          paid: 900000,
          status: 'paid',
        },
      });
    } finally {
      resetMockDb();
      vi.useRealTimers();
    }
  });
  it('requires bank/lifetime/period fields instead of silently fabricating a partial response', () => {
    expect(affiliateAdminRowSchema.safeParse(row).success).toBe(true);
    expect(affiliateAdminListRowSchema.safeParse(row).success).toBe(false);
    const [item] = mockAffiliateListPresentation([row], [row], agents);
    expect(affiliateAdminListRowSchema.parse(item)).toMatchObject({
      bank,
      lifetime: { customers: 2, revenue: 1200000 },
      period: {
        month: null,
        customers: 2,
        commission: 300000,
        payable: 180000,
        paid: 120000,
        status: 'mixed',
      },
    });
  });

  it('keeps selected-period and lifetime values separate without rewriting legacy fields', () => {
    const lifetime = { ...row, customers: 13, revenue: 7800000 };
    const [item] = mockAffiliateListPresentation([row], [lifetime], agents, '2026-09');
    expect(item).toMatchObject({
      customers: 2,
      revenue: 1200000,
      balance: 180000,
      paid: 120000,
      lifetime: { customers: 13, revenue: 7800000 },
      period: { month: '2026-09', customers: 2, commission: 300000, status: 'mixed' },
    });
    expect(row.customers).toBe(2);
  });

  it('preserves missing bank, empty periods and paid-only commissions explicitly', () => {
    const empty = { ...row, customers: 0, revenue: 0, balance: 0, paid: 0, hasBank: false };
    const [none] = mockAffiliateListPresentation([empty], [row], new Map(), '2026-05');
    expect(none).toMatchObject({
      bank: null,
      period: { customers: 0, commission: 0, paid: 0, payable: 0, status: 'none' },
    });
    const [paid] = mockAffiliateListPresentation(
      [{ ...row, balance: 0 }],
      [row],
      agents,
      '2026-09',
    );
    expect(paid?.period).toMatchObject({
      commission: 120000,
      payable: 0,
      paid: 120000,
      status: 'paid',
    });
  });

  it('rejects fractional/negative presentation money and invalid period keys', () => {
    const [valid] = mockAffiliateListPresentation([row], [row], agents, '2026-09');
    if (!valid) throw new Error('Missing fixture');
    for (const commission of [-1, 1.5]) {
      expect(
        affiliateAdminListRowSchema.safeParse({ ...valid, period: { ...valid.period, commission } })
          .success,
      ).toBe(false);
    }
    expect(
      affiliateAdminListRowSchema.safeParse({
        ...valid,
        period: { ...valid.period, month: '2026-13' },
      }).success,
    ).toBe(false);
  });
});
