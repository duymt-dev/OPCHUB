'use client';

import { type PriceConfig, priceConfigSchema } from '@opchub/shared';
import { useToast } from '@opchub/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useIssueMessage } from '@/i18n/use-issue-message';
import { fetchPriceConfig, savePriceConfig, settingsKeys } from '../api';
import { useSettingsMutation } from './use-settings-mutation';

export type PriceGroup = keyof PriceConfig;
export type PriceField<G extends PriceGroup> = keyof PriceConfig[G];

/** Prototype `num`: bỏ ký tự không phải số, rỗng → 0 */
export const toDigits = (v: string): number => Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0);

const plain = (c: PriceConfig): PriceConfig => ({ per: c.per, biz: c.biz, fund: c.fund });

/**
 * D-94 5A (prototype `prcV`): bản nháp + "Hủy thay đổi" khi đã sửa; lưu kiểm "Giá bán không được để
 * trống" / "Thời hạn tối thiểu 1 tháng" trước khi gọi `PUT /admin/price-config` (server kiểm lại).
 */
export function usePriceConfig() {
  const t = useTranslations('settings.price');
  const toast = useToast();
  const issueMessage = useIssueMessage();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: settingsKeys.price, queryFn: fetchPriceConfig });
  const [draft, setDraft] = useState<PriceConfig | null>(null);
  const saved = q.data ? plain(q.data) : null;
  const form = draft ?? saved;
  const dirty = draft !== null && saved !== null && JSON.stringify(draft) !== JSON.stringify(saved);
  const save = useSettingsMutation({ key: settingsKeys.price, fn: savePriceConfig, write: true });

  const set = <G extends PriceGroup>(g: G, k: PriceField<G>, raw: string) => {
    if (!form) return;
    setDraft({ ...form, [g]: { ...form[g], [k]: toDigits(raw) } });
  };

  return {
    form,
    dirty,
    set,
    reset: () => setDraft(null),
    save: () => {
      if (!form || !q.data) return;
      if (!form.per.y || !form.biz.y || !form.fund.p || !form.fund.r) return toast(t('emptySell'));
      if (!(form.fund.mo >= 1)) return toast(t('minMonths'));
      const ok = priceConfigSchema.safeParse(form);
      if (!ok.success) return toast(issueMessage(ok.error.issues[0]));
      save.mutate(
        { ...ok.data, version: q.data.version },
        {
          onSuccess: () => {
            setDraft(null);
            void qc.invalidateQueries({ queryKey: ['public', 'price-config'] });
            toast(t('saved'));
          },
        },
      );
    },
  };
}
