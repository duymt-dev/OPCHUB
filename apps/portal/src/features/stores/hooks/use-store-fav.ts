'use client';

import type { StoreCard, StoreList } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { favoriteStore, storeKeys } from '../api';

/** D-89 (P-105): tim trên thẻ Khám phá — cập nhật ngay mọi trang danh sách trong cache */
export function useStoreFav() {
  const t = useTranslations('stores.card');
  const tMine = useTranslations('stores.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (s: StoreCard) => favoriteStore(s.id, !s.fav),
    onSuccess: (r, s) => {
      qc.setQueriesData<StoreList>({ queryKey: [...storeKeys.all, 'list'] }, (old) =>
        old
          ? { ...old, items: old.items.map((x) => (x.id === s.id ? { ...x, fav: r.fav } : x)) }
          : old,
      );
      toast(r.fav ? t('favOn', { name: s.name }) : t('favOff', { name: s.name }));
    },
    onError: (e) => toast(messageOf(e, tMine('failed'))),
  });
  return (s: StoreCard) => m.mutate(s);
}
