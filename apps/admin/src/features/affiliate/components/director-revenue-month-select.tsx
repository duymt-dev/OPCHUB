'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { Button, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { affiliateMonthLabel } from '../model';
import { revenueMoney } from '../revenue-presentation';
import type { RevenueMonthSelectProps } from '../revenue-types';

export function DirectorRevenueMonthSelect({
  query,
  choices,
  month,
  disabled,
  onChange,
}: RevenueMonthSelectProps) {
  const t = useTranslations('revenue');
  if (query.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void query.refetch()} />
    );
  if (query.isPending) return <PageSkeleton />;
  return (
    <>
      <label htmlFor="revenue-payout-month">{t('month')}</label>
      <Select
        id="revenue-payout-month"
        aria-label={t('month')}
        placeholder={t('selectMonth')}
        value={month}
        disabled={disabled}
        options={choices.map((m) => ({
          value: m.monthKey,
          label: `${affiliateMonthLabel(m.monthKey)} · ${revenueMoney(m.due)}`,
        }))}
        onChange={onChange}
      />
      {!choices.length ? <small>{t('noClosedMonth')}</small> : null}
      {query.hasNextPage ? (
        <Button
          disabled={disabled}
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t('more')}
        </Button>
      ) : null}
    </>
  );
}
