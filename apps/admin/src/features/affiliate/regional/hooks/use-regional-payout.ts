'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RegionalPayee, RegionalRegion } from '@opchub/shared/api-domains';
import { payRegionalShares, regionalShareKey } from '../share-api';
export function useRegionalPayout(region: RegionalRegion, payee: RegionalPayee) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => payRegionalShares(region, payee.userId, key),
    onSuccess: () => client.invalidateQueries({ queryKey: regionalShareKey }),
  });
}
