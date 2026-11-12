'use client';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatNumber } from '@/i18n/format';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import {
  fetchBank,
  fetchBankTxns,
  patchBank,
  testBank,
  simulateBank,
  shortBank,
  exportBank,
  bankKeys,
} from '../bank-api';
import { useSettingsMutation } from './use-settings-mutation';
import { useBankKey } from './use-bank-key';

function downloadBankCsv(r: Awaited<ReturnType<typeof exportBank>>) {
  const url = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = r.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useBankReconcile() {
  const locale = useLocale();
  const t = useTranslations('settings.bank'),
    toast = useToast(),
    qc = useQueryClient();
  const config = useQuery({ queryKey: bankKeys.config, queryFn: fetchBank });
  const list = useInfiniteQuery({
    queryKey: bankKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchBankTxns(pageParam),
    getNextPageParam: (p) => p.nextCursor ?? undefined,
  });
  const { rotate, newKey, clearKey } = useBankKey(config.data?.provider ?? 'fake');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: bankKeys.config });
    void qc.invalidateQueries({ queryKey: bankKeys.list });
  };
  const patch = useSettingsMutation({ key: bankKeys.config, fn: patchBank, write: true });
  const test = useSettingsMutation({
    key: bankKeys.config,
    fn: testBank,
    onDone: (r) =>
      toast(
        t('connected', {
          provider: t(`providers.${r.provider}`),
          n: formatNumber(r.received, locale),
        }),
      ),
  });
  const simulate = useSettingsMutation({
    key: bankKeys.list,
    fn: simulateBank,
    onDone: (r) => {
      refresh();
      toast(
        t(r.autoActivated ? 'simulatedOn' : 'simulatedOff', {
          amount: formatNumber(r.amount, locale),
          content: r.content,
          name: r.memberName,
        }),
      );
    },
  });
  const short = useSettingsMutation({
    key: bankKeys.list,
    fn: shortBank,
    onDone: () => {
      refresh();
      toast(t('shortSaved'));
    },
  });
  const csv = useSettingsMutation({
    key: bankKeys.list,
    fn: exportBank,
    onDone: downloadBankCsv,
  });
  return {
    config,
    list,
    rows: list.data?.pages.flatMap((p) => p.items) ?? [],
    busy:
      patch.isPending ||
      rotate.isPending ||
      test.isPending ||
      simulate.isPending ||
      short.isPending ||
      csv.isPending,
    patch,
    rotate,
    test,
    simulate,
    short,
    csv,
    newKey,
    clearKey,
    refresh,
  };
}
