import {
  affiliateBankSchema,
  affiliatePayoutsSchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
  type AffiliateBank,
  type AffiliatePageQuery,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export const affiliateKeys = {
  all: ['me', 'affiliate'] as const,
  mine: ['me', 'affiliate', 'mine'] as const,
  referrals: (q: AffiliatePageQuery) => ['me', 'affiliate', 'referrals', q] as const,
  payouts: (q: AffiliatePageQuery) => ['me', 'affiliate', 'payouts', q] as const,
};
const query = (q: AffiliatePageQuery) => {
  const params = new URLSearchParams({ page: String(q.page), size: String(q.size) });
  if (q.month) params.set('month', q.month);
  return params.toString();
};
export const fetchAffiliate = () => api('/me/affiliate', { schema: myAffiliateSchema });
export const fetchReferrals = (q: AffiliatePageQuery) =>
  api(`/me/affiliate/referrals?${query(q)}`, { schema: affiliateReferralsSchema });
export const fetchPayouts = (q: AffiliatePageQuery) =>
  api(`/me/affiliate/payouts?${query(q)}`, { schema: affiliatePayoutsSchema });
export const saveBank = (body: AffiliateBank) =>
  api('/me/affiliate/bank', { method: 'PUT', body, schema: affiliateBankSchema });
