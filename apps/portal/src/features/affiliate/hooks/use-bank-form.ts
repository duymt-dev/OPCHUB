'use client';

import { affiliateBankSchema, type AffiliateBank } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormErrors } from '@/lib/use-form-errors';
import { affiliateKeys, saveBank } from '../api';
import { toHolder } from '../model';
import type { BankField } from '../types';

const FIELDS = { bankName: 'bankName', bankNo: 'bankNo', bankHolder: 'bankHolder' } as const;
type Draft = Record<BankField, string>;

export function useBankForm() {
  const t = useTranslations('affiliate.bank');
  const fe = useFormErrors<BankField>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const toast = useToast();
  const qc = useQueryClient();
  const mutation = useMutation({ mutationFn: saveBank });
  const set = (key: BankField, value: string) => {
    fe.clear(key);
    setDraft((old) =>
      old
        ? {
            ...old,
            [key]:
              key === 'bankHolder'
                ? toHolder(value)
                : key === 'bankNo'
                  ? value.replace(/\D/g, '').slice(0, 19)
                  : value,
          }
        : old,
    );
  };
  return {
    draft,
    set,
    err: fe.err,
    busy: mutation.isPending,
    edit: (bank: AffiliateBank | null) => {
      fe.show({});
      setDraft(bank ?? { bankName: '', bankNo: '', bankHolder: '' });
    },
    cancel: () => {
      if (!mutation.isPending) setDraft(null);
    },
    save: async () => {
      if (!draft || mutation.isPending) return;
      const parsed = affiliateBankSchema.safeParse(draft);
      if (!parsed.success) {
        const errors: Partial<Record<BankField, string>> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (key === 'bankName' || key === 'bankNo' || key === 'bankHolder')
            errors[key] = t(`invalid.${key}`);
        }
        fe.check(errors);
        return;
      }
      try {
        await mutation.mutateAsync(parsed.data);
        await qc.invalidateQueries({ queryKey: affiliateKeys.mine });
        setDraft(null);
        toast(t('saved'));
      } catch (error) {
        fe.fromApi(error, FIELDS, t('failed'));
      }
    },
  };
}
