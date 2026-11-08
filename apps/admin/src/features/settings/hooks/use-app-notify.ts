'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { AppNotifySettings } from '@opchub/shared/api-domains';
import { appNotifyKey, fetchAppNotify, saveAppNotify, testAppNotify } from '../app-notify-api';
import { useSettingsMutation } from './use-settings-mutation';
export function useAppNotify() {
  const t = useTranslations('settings.app');
  const toast = useToast();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: appNotifyKey, queryFn: fetchAppNotify });
  const [draft, setDraft] = useState<AppNotifySettings | null>(null);
  const form = draft ?? query.data;
  const save = useSettingsMutation({
    key: appNotifyKey,
    fn: saveAppNotify,
    write: true,
    onDone: () => {
      setDraft(null);
      toast(t('saved'));
    },
  });
  const send = useSettingsMutation({
    key: appNotifyKey,
    fn: testAppNotify,
    onDone: (result) => {
      toast(result.deviceCount ? t('sentDevices', { n: result.deviceCount }) : t('noDevices'));
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  return { query, form, setDraft, save, send, busy: save.isPending || send.isPending };
}
