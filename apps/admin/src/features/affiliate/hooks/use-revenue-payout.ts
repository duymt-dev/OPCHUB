'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { payDirectorRevenue, revenueKeys } from '../revenue-sharing-api';
import { revenueMoney } from '../revenue-presentation';
import { useAffiliateAccess } from './use-affiliate-access';

export function useRevenuePayout(id: string) {
  const access = useAffiliateAccess();
  const client = useQueryClient();
  const toast = useToast();
  const t = useTranslations('revenue');
  const write = useMutation({
    mutationFn: async ({ month, key }: { month: string; key: string }) => {
      if (!access.guard('affiliate.payout')) return null;
      return payDirectorRevenue(id, month, key);
    },
    onSuccess: async (receipt) => {
      if (!receipt) return;
      toast(t('paidToast', { amount: revenueMoney(receipt.amount), name: receipt.directorName }));
      await client.invalidateQueries({ queryKey: revenueKeys.all });
    },
    onError: (error) => toast(messageOf(error, t('error'))),
  });
  return { write, canPay: access.payout };
}
