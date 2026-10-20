'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCan } from '@/lib/permissions';
import {
  affiliateKeys,
  fetchAffiliateCustomers,
  fetchAffiliateDetail,
  fetchAffiliateMonths,
  fetchAffiliatePolicy,
} from '../api';
import type { AffiliateDetailParams } from '../types';
import { useAffiliateCustomerCount } from './use-affiliate-customer-count';

export function useAffiliateDetail(id: string, params: AffiliateDetailParams) {
  const allowed = useCan('affiliate.view');
  const customerCount = useAffiliateCustomerCount(id);
  const page = { page: params.page, size: params.size };
  const detail = useQuery({
    queryKey: affiliateKeys.detail(id),
    queryFn: () => fetchAffiliateDetail(id),
    enabled: allowed && !!id,
  });
  const policy = useQuery({
    queryKey: affiliateKeys.policy,
    queryFn: fetchAffiliatePolicy,
    enabled: allowed && !!id,
  });
  const months = useQuery({
    queryKey: affiliateKeys.months(id, page),
    queryFn: () => fetchAffiliateMonths(id, page),
    enabled: allowed && !!id && params.tab === 'months',
    placeholderData: keepPreviousData,
  });
  const customers = useQuery({
    queryKey: affiliateKeys.customers(id, page),
    queryFn: () => fetchAffiliateCustomers(id, page),
    enabled: allowed && !!id && params.tab === 'customers',
    placeholderData: keepPreviousData,
  });
  return { detail, months, customers, policy, customerCount };
}
