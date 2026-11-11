'use client';

import { useToast } from '@opchub/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { messageOf } from '@/lib/api-errors';
import { fetchNeeds, moderateNeeds, needKeys } from '../api';
import { toggleAll } from '../model';
import type { NeedParams } from '../types';
import { useNumberText } from '@/i18n/use-number-text';

export function useNeeds(params: NeedParams) {
  return useQuery({
    queryKey: needKeys.list(params),
    queryFn: () => fetchNeeds(params),
    placeholderData: keepPreviousData,
  });
}

/** Ô chọn của bảng: một dòng, cả trang hiện tại, bỏ chọn */
export function useSelection() {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return {
    sel,
    toggle: (id: string) =>
      setSel((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    togglePage: (ids: readonly string[]) => setSel((s) => toggleAll(s, ids)),
    clear: () => setSel(new Set()),
  };
}

/** Ẩn / Hiển thị (đơn lẻ, hàng loạt) — BE ghi audit_logs từng nhu cầu (luật 10) */
export function useNeedModeration(onDone: () => void) {
  const numberText = useNumberText();
  const t = useTranslations('needs.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: ({ action, ids }: { action: 'hide' | 'show'; ids: string[] }) =>
      moderateNeeds(action, ids),
    onSuccess: (_d, v) => {
      // Prototype đếm theo số nhu cầu được chọn ("Đã ẩn N nhu cầu")
      toast(t(v.action === 'hide' ? 'hidden' : 'shown', { n: numberText(v.ids.length) }));
      onDone();
      void qc.invalidateQueries({ queryKey: needKeys.all });
    },
    onError: (e) => toast(messageOf(e, t('failed'))),
  });
  return {
    hide: (ids: string[]) => m.mutate({ action: 'hide', ids }),
    show: (ids: string[]) => m.mutate({ action: 'show', ids }),
  };
}
