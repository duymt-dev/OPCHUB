import { affiliateMonthSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';

export const AFFILIATE_PAGE_SIZE = 6;
export const affiliateUrlSchema = z.object({
  tab: z.enum(['ref', 'hist', 'reg']).catch('ref'),
  month: affiliateMonthSchema.or(z.literal('')).catch(''),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});

export const toHolder = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '');

export const monthKey = (now: number) => new Date(now + 7 * 3600000).toISOString().slice(0, 7);
export const monthLabel = (key: string) => `${key.slice(5)}/${key.slice(0, 4)}`;
export const endOfMonth = (key: string) => {
  const [year = 2026, month = 1] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString();
};

export function shareLinks(link: string, subject: string) {
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    zalo: `https://zalo.me/share?url=${encodeURIComponent(link)}`,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(link)}`,
  };
}

/** A filter's empty last page must move back in the URL, never silently render page 1. */
export const lastPage = (total: number, size = AFFILIATE_PAGE_SIZE) =>
  Math.max(1, Math.ceil(total / size));
