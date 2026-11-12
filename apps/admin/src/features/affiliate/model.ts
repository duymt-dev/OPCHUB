import { affiliateMonthSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { formatDate } from '@/i18n/format';
import type { AffiliatePageQuery } from '@opchub/shared/api-domains';

const sizeSchema = z.coerce.number().int().min(1).max(100);
export const DETAIL_PAGE_SIZES = [8, 10, 20, 50, 100];
const paging = {
  page: z.coerce.number().int().positive().catch(1),
  size: sizeSchema.catch(10),
};

export const affiliateParamsSchema = z
  .object({
    tab: z.enum(['com', 'aff', 'gdv', 'gcfg', 'cfg']).catch('com'),
    q: z.string().trim().max(200).catch(''),
    month: z.union([affiliateMonthSchema, z.literal('all')]).catch(''),
    status: z.enum(['all', 'recorded', 'paid', 'cancelled']).catch('all'),
    ...paging,
  })
  .transform((params) => ({
    ...params,
    month: params.tab === 'aff' && !params.month ? currentAffiliateMonth() : params.month,
  }));

/** Calendar selection only; amounts and period aggregates come from the API. */
export function currentAffiliateMonth(now = Date.now()): string {
  return new Date(now + 7 * 3_600_000).toISOString().slice(0, 7);
}

export const affiliateDetailParamsSchema = z.object({
  tab: z.enum(['months', 'customers']).catch('months'),
  ...paging,
  size: sizeSchema.catch(8),
});

/** Omit empty optional filters; both list endpoints share the backend query contract. */
export function affiliateQuery(params: AffiliatePageQuery): string {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.month && params.month !== 'all') query.set('month', params.month);
  return query.toString();
}

export function affiliateMonthLabel(key: string, locale = 'vi'): string {
  const parsed = affiliateMonthSchema.safeParse(key);
  if (!parsed.success) return key;
  return locale === 'vi'
    ? `${key.slice(5)}/${key.slice(0, 4)}`
    : formatDate(`${key}-01`, locale, { month: '2-digit', year: 'numeric' });
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
