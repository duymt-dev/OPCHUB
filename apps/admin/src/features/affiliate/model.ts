import { affiliateMonthSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';

const paging = {
  page: z.coerce.number().int().positive().catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(10),
};

export const affiliateParamsSchema = z.object({
  tab: z.enum(['com', 'aff', 'cfg']).catch('com'),
  q: z.string().trim().max(200).catch(''),
  month: affiliateMonthSchema.catch(''),
  status: z.enum(['all', 'recorded', 'paid', 'cancelled']).catch('all'),
  ...paging,
});

export const affiliateDetailParamsSchema = z.object({
  tab: z.enum(['months', 'customers']).catch('months'),
  ...paging,
});

/** Omit empty optional filters; both list endpoints share the backend query contract. */
export function affiliateQuery(params: AffiliatePageQuery): string {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.month) query.set('month', params.month);
  return query.toString();
}

export function affiliateMonthLabel(key: string): string {
  const parsed = affiliateMonthSchema.safeParse(key);
  return parsed.success ? `${key.slice(5)}/${key.slice(0, 4)}` : key;
}

/** Financial totals remain server-owned; this only gates an ended calendar month. */
export function isClosedAffiliateMonth(key: string, now = Date.now()): boolean {
  if (!affiliateMonthSchema.safeParse(key).success) return false;
  const current = new Date(now + 7 * 3_600_000).toISOString().slice(0, 7);
  return key < current;
}

export const commissionStatusKeys = {
  recorded: 'recorded',
  paid: 'paid',
  cancelled: 'cancelled',
} as const;
