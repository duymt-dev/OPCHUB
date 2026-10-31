'use client';

import { ErrorState } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { usePricesQuery } from '@/lib/use-prices';
import { policyYears, previewPolicy } from '../policy-preview';
import { RevenuePolicyPlans } from './revenue-policy-plans';
import { RevenuePolicyYears } from './revenue-policy-years';
import styles from './revenue-policy-tables.module.css';

export function RevenuePolicyPreview({ values }: { values: unknown }) {
  const t = useTranslations('affiliate.policyPreview');
  const prices = usePricesQuery();
  const policy = previewPolicy(values);
  if (!policy)
    return (
      <p role="status" className={styles.invalid}>
        {t('invalid')}
      </p>
    );
  const years = policyYears(policy);
  return (
    <>
      <RevenuePolicyYears years={years} policy={policy} />
      <h4 className={styles.plansHeading}>{t('plansTitle')}</h4>
      {prices.isError ? (
        <ErrorState
          title={t('pricesError')}
          retryLabel={t('retry')}
          onRetry={() => void prices.refetch()}
        />
      ) : prices.data ? (
        <RevenuePolicyPlans years={years} prices={prices.data} />
      ) : (
        <p role="status">{t('pricesLoading')}</p>
      )}
    </>
  );
}
