'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { RegionalRegion } from '@opchub/shared/api-domains';
import type { RegionalAction } from '../types';
import { useCan } from '@/lib/permissions';
import { messageOf } from '@/lib/api-errors';
import { appointRegional, revokeRegional, patchRegional, regionalKey } from '../api';

export function useRegionalWrites(region: RegionalRegion) {
  const can = useCan('affiliate.regional');
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('affiliate.regional');
  return useMutation({
    mutationFn: (a: RegionalAction) => {
      if (!can) throw new Error(t('forbidden'));
      if (a.kind === 'appoint') return appointRegional(region, a.userId);
      if (a.kind === 'revoke') return revokeRegional(region);
      return patchRegional(region, a.patch);
    },
    onSuccess: async (_, a) => {
      toast(
        a.kind === 'appoint'
          ? t('appointed', { name: a.name, email: a.email })
          : a.kind === 'revoke'
            ? t('revoked', { name: a.name })
            : t('saved'),
      );
      await qc.invalidateQueries({ queryKey: regionalKey });
      await qc.invalidateQueries({ queryKey: ['admin-fees'] });
    },
    onError: (e) => toast(messageOf(e, t('error'))),
  });
}
