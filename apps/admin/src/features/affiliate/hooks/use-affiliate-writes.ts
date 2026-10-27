'use client';

import type { AffiliatePolicy } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import {
  affiliateKeys,
  exportAffiliates,
  exportCommissions,
  payAffiliateMonth,
  saveAffiliatePolicy,
  setAffiliateRate,
  setAffiliateRates,
} from '../api';
import { affiliateMoney } from '../format';
import { useAffiliateAccess } from './use-affiliate-access';
import { useCommissionStatusWrites } from './use-commission-status-writes';

function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Recheck permission at the mutation boundary, including forms rendered in portals. */
export function useAffiliateWrites() {
  const access = useAffiliateAccess();
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('affiliate');
  const fail = (error: unknown) => toast(messageOf(error, t('error')));
  const refresh = () => qc.invalidateQueries({ queryKey: affiliateKeys.all });
  const { cancel, restore } = useCommissionStatusWrites();
  const rates = useMutation({
    mutationFn: async (body: { ids: string[]; rate: number }) => {
      if (!access.guard('affiliate.action')) return null;
      return body.ids.length === 1 && body.ids[0]
        ? setAffiliateRate(body.ids[0], body.rate)
        : setAffiliateRates(body.ids, body.rate);
    },
    onSuccess: async (result, body) => {
      if (!result) return;
      toast(t('toast.rates', { rate: body.rate, n: result.updated }));
      await refresh();
    },
    onError: fail,
  });
  const payout = useMutation({
    mutationFn: async (body: { id: string; month: string; key: string }) => {
      if (!access.guard('affiliate.payout')) return null;
      return payAffiliateMonth(body.id, body.month, body.key);
    },
    onSuccess: async (result) => {
      if (!result) return;
      toast(t('toast.paid', { amount: affiliateMoney(result.amount) }));
      await refresh();
    },
    onError: fail,
  });
  const policy = useMutation({
    mutationFn: async (body: AffiliatePolicy) => {
      if (!access.guard('affiliate.action')) return null;
      return saveAffiliatePolicy(body);
    },
    onSuccess: async (result) => {
      if (!result) return;
      toast(t('toast.policy'));
      await refresh();
    },
    onError: fail,
  });
  const csv = useMutation({
    mutationFn: async (body: {
      type: 'com' | 'aff';
      ids?: string[];
      q?: string;
      status?: 'all' | 'recorded' | 'paid' | 'cancelled';
    }) => {
      if (!access.guard('affiliate.action')) return null;
      const { type, ...filter } = body;
      return type === 'com' ? exportCommissions(filter) : exportAffiliates(filter);
    },
    onSuccess: (result) => {
      if (result) {
        download(result.filename, result.csv);
        toast(t('toast.exported'));
      }
    },
    onError: fail,
  });
  return { access, cancel, restore, rates, payout, policy, csv };
}
