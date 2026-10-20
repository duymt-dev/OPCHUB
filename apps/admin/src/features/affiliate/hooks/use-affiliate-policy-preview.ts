'use client';

import { affiliatePolicySchema } from '@opchub/shared/api-domains';
import { skipToken, useQuery } from '@tanstack/react-query';
import { affiliateKeys, fetchAffiliatePolicyPreview } from '../api';
import { useAffiliateAccess } from './use-affiliate-access';

export function useAffiliatePolicyPreview(value: unknown) {
  const parsed = affiliatePolicySchema.shape.defaultRate.safeParse(value);
  const { view } = useAffiliateAccess();
  const valid = view && parsed.success;
  const query = useQuery({
    queryKey: affiliateKeys.policyPreview(parsed.success ? parsed.data : null),
    queryFn: valid ? () => fetchAffiliatePolicyPreview(parsed.data) : skipToken,
    staleTime: 30_000,
  });
  // A slow or inconsistent response for another rate must never label this draft.
  const data = valid && query.data?.rate === parsed.data ? query.data : undefined;
  const mismatched = valid && query.data !== undefined && query.data.rate !== parsed.data;
  return { valid, data, isError: query.isError || mismatched };
}
