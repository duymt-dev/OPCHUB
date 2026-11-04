'use client';
import { useQuery } from '@tanstack/react-query';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import { useCan } from '@/lib/permissions';
import { fetchRegional, fetchRegionalCandidates, regionalKey } from '../api';

export function useRegionalDirectors() {
  const enabled = useCan('affiliate.view');
  return useQuery({ queryKey: regionalKey, queryFn: fetchRegional, enabled });
}

export function useRegionalCandidates(region: RegionalRegion, q: string, open: boolean) {
  const allowed = useCan('affiliate.regional');
  return useQuery({
    queryKey: [...regionalKey, 'candidates', region, q],
    queryFn: () => fetchRegionalCandidates(region, q),
    enabled: allowed && open,
  });
}
