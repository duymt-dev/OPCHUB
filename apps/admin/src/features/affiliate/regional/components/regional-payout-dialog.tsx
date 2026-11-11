'use client';
import { useRef } from 'react';
import { App, Button } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import type { RegionalRegion, RegionalPayee } from '@opchub/shared/api-domains';
import { useRegionalPayout } from '../hooks/use-regional-payout';
import { affiliateMoney } from '../../format';
export function RegionalPayoutDialog({
  region,
  payee,
}: {
  region: RegionalRegion;
  payee: RegionalPayee;
}) {
  const locale = useLocale();
  const t = useTranslations('affiliate.regional.share');
  const { modal } = App.useApp();
  const toast = useToast();
  const write = useRegionalPayout(region, payee);
  const key = useRef<string | undefined>(undefined);
  const open = () => {
    key.current ??= crypto.randomUUID();
    modal.confirm({
      title: t('payTitle', { name: payee.fullName }),
      content: t('payConfirm', {
        amount: affiliateMoney(payee.due, locale),
        months: payee.monthKeys.join(', '),
        bank: payee.bank
          ? `${payee.bank.bankHolder} · ${payee.bank.bankName} · ${payee.bank.bankNo}`
          : t('noBank'),
      }),
      okText: t('pay'),
      cancelText: t('cancel'),
      onOk: async () => {
        try {
          const result = await write.mutateAsync(key.current ?? crypto.randomUUID());
          key.current = undefined;
          toast(
            t('paidToast', {
              amount: affiliateMoney(result.amount, locale),
              name: result.directorName,
              holder: result.bankHolder,
            }),
          );
        } catch (error) {
          toast(error instanceof Error ? error.message : t('error'));
          throw error;
        }
      },
    });
  };
  return (
    <Button
      size="small"
      type="primary"
      loading={write.isPending}
      aria-label={t('payTitle', { name: payee.fullName })}
      onClick={open}
    >
      {t('pay')}
    </Button>
  );
}
