'use client';

import SearchOutlined from '@ant-design/icons/SearchOutlined';
import { FilterBar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { revenueMoney, revenuePeriodEnd, revenuePolicySteps } from '../revenue-presentation';
import type { RevenueHeaderProps } from '../revenue-types';
import { useRevenueSearch } from '../hooks/use-revenue-search';
import base from './affiliate.module.css';
import styles from './revenue-sharing.module.css';

export function RevenueSharingHeader({ data, query, onQuery }: RevenueHeaderProps) {
  const t = useTranslations('revenue');
  const search = useRevenueSearch(query, onQuery);
  const period = revenuePeriodEnd(data.asOf);
  const steps = revenuePolicySteps(data.policy);
  const rule = steps.constant
    ? t('policyConstant', { rate: steps.first })
    : [
        ...steps.years.map((s) => t('policyYear', s)),
        ...(steps.floorYear && steps.floorYear > 4 ? ['…'] : []),
        t('policyFloor', { rate: steps.floor, year: steps.floorYear ?? 1 }),
      ].join(' · ');
  return (
    <>
      <div className={styles.stats}>
        <div>
          <small>{t('allocated')}</small>
          <b>{revenueMoney(data.stats.allocated)}</b>
          <small>
            {t('receiptCaption', {
              receipts: data.stats.receiptCount,
              affiliates: data.stats.affiliateCount,
            })}
          </small>
        </div>
        <div>
          <small>{t('due')}</small>
          <b>{revenueMoney(data.visible.due)}</b>
          <small>{t('period', { date: period })}</small>
        </div>
        <div>
          <small>{t('paid')}</small>
          <b>{revenueMoney(data.visible.paid)}</b>
          <small>{t('cumulative')}</small>
        </div>
      </div>
      <div className={`${base.search} ${styles.search}`} data-ro-ok>
        <SearchOutlined className={`${styles.searchIcon}`} />
        <FilterBar search={{ ...search, placeholder: t('search') }} />
      </div>
      <small className={styles.rule}>{t('policy', { rule, date: period })}</small>
    </>
  );
}
