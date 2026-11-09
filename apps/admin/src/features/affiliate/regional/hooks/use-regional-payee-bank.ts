'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import type { RegionalRegion, RegionalSlot } from '@opchub/shared/api-domains';
import { messageOf } from '@/lib/api-errors';
import { saveRegionalPayeeBank, regionalShareKey } from '../share-api';

export function useRegionalPayeeBank(region: RegionalRegion, userId: string) {
  const client = useQueryClient();
  const toast = useToast();
  const t = useTranslations('affiliate.regional');
  return useMutation({
    mutationFn: (bank: RegionalSlot['bank']) => saveRegionalPayeeBank(region, userId, bank),
    onSuccess: async () => {
      toast(t('saved'));
      await client.invalidateQueries({ queryKey: regionalShareKey });
    },
    onError: (error) => toast(messageOf(error, t('error'))),
  });
}
