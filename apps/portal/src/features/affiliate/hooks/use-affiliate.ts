'use client';

import type { AffiliatePageQuery } from '@opchub/shared/api-domains';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useUrlParams } from '@/lib/use-url-params';
import { affiliateKeys, fetchAffiliate, fetchPayouts, fetchReferrals } from '../api';
import { AFFILIATE_PAGE_SIZE, affiliateUrlSchema, lastPage, monthKey } from '../model';
import { useCalendarClock } from './use-calendar-clock';

export function useAffiliate() {
  const feeStatus = useAuthStore((s) => s.me?.membershipFee?.status);
  return useQuery({
    // A fee confirmation updates the auth session: refetch locked/paused state immediately.
    queryKey: [...affiliateKeys.mine, feeStatus],
    queryFn: fetchAffiliate,
  });
}

export const useReferrals = (q: AffiliatePageQuery) =>
  useQuery({
    queryKey: affiliateKeys.referrals(q),
    queryFn: () => fetchReferrals(q),
    placeholderData: keepPreviousData,
  });
export const usePayouts = (q: AffiliatePageQuery) =>
  useQuery({
    queryKey: affiliateKeys.payouts(q),
    queryFn: () => fetchPayouts(q),
    placeholderData: keepPreviousData,
  });

export function useAffiliateHistory() {
  const { params, update } = useUrlParams(affiliateUrlSchema);
  const now = useCalendarClock();
  const month = params.month || monthKey(now);
  const refs = useReferrals({ page: params.page, size: AFFILIATE_PAGE_SIZE, month });
  const allRefs = useReferrals({ page: 1, size: 1 });
  const payouts = usePayouts({
    page: params.tab === 'hist' ? params.page : 1,
    size: AFFILIATE_PAGE_SIZE,
  });
  const active = params.tab === 'hist' ? payouts : refs;
  useEffect(() => {
    if (!active.isPlaceholderData && active.data && params.page > lastPage(active.data.total))
      update({ page: lastPage(active.data.total) });
  }, [active.data, active.isPlaceholderData, params.page, update]);
  return { params, month, update, refs, allRefs, payouts };
}
