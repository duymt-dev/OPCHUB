'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { RenewalSettings, RenewalSend } from '@opchub/shared/api-domains';
import {
  fetchRenewal,
  fetchRenewalMembers,
  saveRenewal,
  sendRenewal,
  renewalKeys,
} from '../renewal-api';
import { useSettingsMutation } from './use-settings-mutation';
import { useNumberText } from '@/i18n/use-number-text';

export function useRenewal() {
  const numberText = useNumberText();
  const t = useTranslations('settings.renewal');
  const toast = useToast();
  const q = useQuery({ queryKey: renewalKeys.config, queryFn: fetchRenewal });
  const list = useInfiniteQuery({
    queryKey: renewalKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchRenewalMembers(pageParam),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const [draft, setDraft] = useState<RenewalSettings | null>(null);
  const form = draft ?? q.data;
  const save = useSettingsMutation({
    key: renewalKeys.config,
    fn: saveRenewal,
    write: true,
    onDone: () => {
      setDraft(null);
      void list.refetch();
      toast(t('saved'));
    },
  });
  const send = useSettingsMutation({
    key: renewalKeys.list,
    fn: sendRenewal,
    onDone: (r) =>
      toast(
        t('sent', {
          n: numberText(r.sent),
          channels: r.channels
            .map((c) => t(c === 'email' ? 'channelEmail' : 'channelApp'))
            .join(', '),
        }),
      ),
  });
  return {
    form,
    list,
    rows: list.data?.pages.flatMap((p) => p.items) ?? [],
    total: list.data?.pages[0]?.total ?? 0,
    loading: q.isPending || list.isPending,
    error: q.isError || list.isError,
    busy: save.isPending || send.isPending,
    set: <K extends keyof RenewalSettings>(
      group: K,
      key: keyof RenewalSettings[K],
      value: boolean,
    ) => {
      if (form) setDraft({ ...form, [group]: { ...form[group], [key]: value } });
    },
    save: () => {
      if (form) save.mutate(form);
    },
    send: (body: RenewalSend) => {
      if (!form?.channels.email && !form?.channels.app) return toast(t('noChannel'));
      if (draft) {
        toast(t('saveFirst'));
        return;
      }
      send.mutate(body);
    },
    retry: () => {
      void q.refetch();
      void list.refetch();
    },
  };
}
