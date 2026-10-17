'use client';

import { welcomeMailSchema, type WelcomeMail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { fetchWelcome, saveWelcome, settingsKeys, testWelcome } from '../api';
import { useSettingsMutation } from './use-settings-mutation';

/** Tài liệu đính kèm trống cả hai ô bị bỏ khi lưu (prototype chỉ hiện dòng có nội dung) */
const clean = (w: WelcomeMail): WelcomeMail => ({
  ...w,
  attachments: w.attachments.filter((a) => a.title.trim() || a.url.trim()),
  rules: w.rules.map((r) => r.trim()).filter(Boolean),
});

/** D-70 Email chào mừng (D-30): bản nháp ở client, "Lưu mẫu" PUT, "Gửi thử" tới email admin */
export function useWelcomeMail() {
  const t = useTranslations('settings.mail');
  const toast = useToast();
  const me = useAuthStore((s) => s.me?.email ?? '');
  const q = useQuery({ queryKey: settingsKeys.welcome, queryFn: fetchWelcome });
  const [draft, setDraft] = useState<WelcomeMail | null>(null);
  const cur = draft ?? q.data;
  const save = useSettingsMutation({ key: settingsKeys.welcome, fn: saveWelcome, write: true });
  const test = useSettingsMutation({ key: settingsKeys.welcome, fn: testWelcome });

  const edit = (patch: Partial<WelcomeMail>) => cur && setDraft({ ...cur, ...patch });

  return {
    mail: cur,
    edit,
    save: () => {
      if (!cur) return;
      const parsed = welcomeMailSchema.safeParse(clean(cur));
      if (!parsed.success) return toast(t('invalid'));
      save.mutate(parsed.data, {
        onSuccess: () => {
          setDraft(null);
          toast(t('saved'));
        },
      });
    },
    test: () => test.mutate(me, { onSuccess: (r) => toast(r.message) }),
  };
}
