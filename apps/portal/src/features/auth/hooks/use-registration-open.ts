'use client';

import { publicSettingsSchema } from '@opchub/shared/api';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { KEEP_SCROLL } from '../keep-scroll';

export const usePublicSettings = () =>
  useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api('/public/settings', { schema: publicSettingsSchema }),
    staleTime: 60_000,
  });

/** Sang /register; admin tắt "Cho phép tự đăng ký" thì chỉ báo tạm đóng (A-11) */
export function useRegistrationOpen() {
  const t = useTranslations('auth.register');
  const toast = useToast();
  const router = useRouter();
  const { data, refetch } = usePublicSettings();
  return async () => {
    const current = data ?? (await refetch({ cancelRefetch: false })).data;
    if (!current) {
      toast(t('settingsUnavailable'));
      return;
    }
    if (!current.registrationOpen) toast(t('closed'));
    else router.push('/register', KEEP_SCROLL);
  };
}
