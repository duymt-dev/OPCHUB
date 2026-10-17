'use client';

import type { GeneralSettingsPatch } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchGeneral, patchGeneral, settingsKeys } from '../api';
import { useSettingsMutation } from './use-settings-mutation';

/** D-66 Chung: đọc + vá từng phần (ô chữ lưu khi rời ô, công tắc lưu ngay) */
export function useGeneral() {
  const t = useTranslations('settings.general');
  const toast = useToast();
  const q = useQuery({ queryKey: settingsKeys.general, queryFn: fetchGeneral });
  const m = useSettingsMutation({
    key: settingsKeys.general,
    fn: (p: GeneralSettingsPatch) => patchGeneral(p),
    write: true,
  });
  const save = (p: GeneralSettingsPatch, msg?: string) =>
    m.mutate(p, { onSuccess: () => msg && toast(msg) });
  return { data: q.data, save, t, toast };
}
