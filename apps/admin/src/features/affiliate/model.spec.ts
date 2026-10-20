import { describe, expect, it, vi } from 'vitest';
import {
  affiliateDetailParamsSchema,
  affiliateMonthLabel,
  affiliateParamsSchema,
  affiliateQuery,
  commissionStatusKeys,
  isClosedAffiliateMonth,
} from './model';

describe('REQ-312 Affiliate Admin URL model', () => {
  it('defaults agents to the current VN month while explicit all-month selection survives serialization', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T18:00:00Z'));
    try {
      expect(affiliateParamsSchema.parse({ tab: 'aff' }).month).toBe('2026-10');
      expect(affiliateParamsSchema.parse({ tab: 'com' }).month).toBe('');
      const all = affiliateParamsSchema.parse({ tab: 'aff', month: 'all' });
      expect(all.month).toBe('all');
      expect(affiliateQuery(all)).toBe('page=1&size=10');
      expect(affiliateParamsSchema.parse({ tab: 'aff', month: '2026-09' }).month).toBe('2026-09');
    } finally {
      vi.useRealTimers();
    }
  });
  it('uses eight rows for detail history, ten for main lists, and preserves an explicit size', () => {
    expect(affiliateDetailParamsSchema.parse({ tab: 'customers' }).size).toBe(8);
    expect(affiliateDetailParamsSchema.parse({ size: 'invalid' }).size).toBe(8);
    expect(affiliateDetailParamsSchema.parse({ size: '20' }).size).toBe(20);
    expect(affiliateParamsSchema.parse({}).size).toBe(10);
  });
  it('defaults invalid tabs, status, month and page without trusting URL input', () => {
    expect(affiliateParamsSchema.parse({})).toEqual({
      tab: 'com',
      q: '',
      status: 'all',
      month: '',
      page: 1,
      size: 10,
    });
    expect(
      affiliateParamsSchema.parse({
        tab: 'unknown',
        status: 'approved',
        month: '2026-13',
        page: '-1',
        size: '1000',
      }),
    ).toEqual(affiliateParamsSchema.parse({}));
  });

  it('retains valid filters, trims search, and coerces paging for F5', () => {
    expect(
      affiliateParamsSchema.parse({
        tab: 'aff',
        q: '  Lê Thu Hà  ',
        month: '2026-09',
        page: '2',
        size: '20',
        status: 'paid',
      }),
    ).toEqual({
      tab: 'aff',
      q: 'Lê Thu Hà',
      month: '2026-09',
      page: 2,
      size: 20,
      status: 'paid',
    });
    expect(affiliateDetailParamsSchema.parse({ tab: 'customers', page: '3', size: '50' })).toEqual({
      tab: 'customers',
      page: 3,
      size: 50,
    });
    expect(affiliateDetailParamsSchema.parse({ tab: 'cfg' }).tab).toBe('months');
  });

  it('encodes query search rather than injecting filters and omits empty filters', () => {
    const query = new URLSearchParams(
      affiliateQuery({
        page: 2,
        size: 10,
        q: 'Hà &status=paid',
        month: '2026-09',
      }),
    );
    expect(query.get('q')).toBe('Hà &status=paid');
    expect(query.get('status')).toBeNull();
    expect(query.get('month')).toBe('2026-09');
    expect(affiliateQuery({ page: 1, size: 10, q: ' ', month: '' })).toBe('page=1&size=10');
  });

  it('REQ-309 only offers payout after the month ends in Vietnam, including year rollover', () => {
    const before = Date.parse('2026-10-31T16:59:59Z');
    const after = Date.parse('2026-10-31T17:00:00Z');
    expect(isClosedAffiliateMonth('2026-10', before)).toBe(false);
    expect(isClosedAffiliateMonth('2026-10', after)).toBe(true);
    expect(isClosedAffiliateMonth('2027-01', after)).toBe(false);
    expect(isClosedAffiliateMonth('2026-12', Date.parse('2026-12-31T17:00:00Z'))).toBe(true);
    expect(isClosedAffiliateMonth('2026-13', after)).toBe(false);
  });

  it('labels months and only backend commission states, without inventing approval', () => {
    expect(affiliateMonthLabel('2026-09')).toBe('09/2026');
    expect(affiliateMonthLabel('invalid')).toBe('invalid');
    expect(Object.keys(commissionStatusKeys)).toEqual(['recorded', 'paid', 'cancelled']);
  });
});
