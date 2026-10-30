'use client';

import { Modal } from '@opchub/ui';
import { Button } from 'antd';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRevenueMonths } from '../hooks/use-revenue-sharing';
import { useRevenuePayout } from '../hooks/use-revenue-payout';
import { affiliateMonthLabel, isClosedAffiliateMonth } from '../model';
import { revenueMoney } from '../revenue-presentation';
import type { RevenuePayoutProps } from '../revenue-types';
import styles from './revenue-sharing.module.css';
import { DirectorRevenueMonthSelect } from './director-revenue-month-select';

export function DirectorRevenuePayout({ row, onClose }: RevenuePayoutProps) {
  const t = useTranslations('revenue');
  const months = useRevenueMonths(row.directorId ?? '');
  const { write, canPay } = useRevenuePayout(row.directorId ?? '');
  const [intent, setIntent] = useState<{ month: string; key: string } | null>(null);
  const choices =
    months.data?.pages
      .flatMap((p) => p.items)
      .filter((m) => BigInt(m.due) > 0n && isClosedAffiliateMonth(m.monthKey)) ?? [];
  const selected = choices.find((m) => m.monthKey === intent?.month);
  const submit = () => {
    if (!intent || !selected || !row.directorId || !row.bank) return;
    void write
      .mutateAsync(intent)
      .then((receipt) => {
        if (receipt) onClose();
      })
      .catch(() => undefined);
  };
  return (
    <Modal
      open
      title={t('payoutTitle')}
      onClose={onClose}
      size="small"
      dismissible={!write.isPending}
      maskClosable={!write.isPending}
      footer={
        <>
          <Button disabled={write.isPending} onClick={onClose}>
            {t('close')}
          </Button>
          <Button
            type="primary"
            loading={write.isPending}
            disabled={!canPay || !selected || !row.bank || months.isError || months.isFetching}
            onClick={submit}
          >
            {t('pay')}
          </Button>
        </>
      }
    >
      <div className={styles.payout}>
        <b>{row.name ?? t('missingIdentity')}</b>
        <small>{t('closedMonths')}</small>
        {row.bank ? (
          <p>
            {t('receiptBank', {
              holder: row.bank.bankHolder,
              bank: row.bank.bankName,
              account: row.bank.bankNo,
            })}
          </p>
        ) : (
          <p>{t('missingBank')}</p>
        )}
        <DirectorRevenueMonthSelect
          query={months}
          choices={choices}
          month={intent?.month ?? null}
          disabled={write.isPending}
          onChange={(month) => setIntent({ month, key: crypto.randomUUID() })}
        />
        {selected ? (
          <p>
            {t('confirm', {
              name: row.name ?? row.directorId ?? '',
              month: affiliateMonthLabel(selected.monthKey),
              amount: revenueMoney(selected.due),
            })}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
