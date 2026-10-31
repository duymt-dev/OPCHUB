'use client';

import type { PriceConfig } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import { policyPlanAmounts } from '../policy-preview';
import { revenueMoney } from '../revenue-presentation';
import type { PolicyYear } from '../types';
import styles from './revenue-policy-tables.module.css';

export function RevenuePolicyPlans({
  years,
  prices,
}: {
  years: PolicyYear[];
  prices: PriceConfig;
}) {
  const t = useTranslations('affiliate.policyPreview');
  const plans = [
    { key: 'personal', amount: prices.per.y, project: false },
    { key: 'business', amount: prices.biz.y, project: false },
    { key: 'fundraising', amount: prices.fund.p, project: true },
  ] as const;
  return (
    // Keyboard users must be able to focus and horizontally scroll the real table on mobile.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={styles.scroll} role="region" aria-label={t('plansTitle')} tabIndex={0}>
      <table className={styles.plans}>
        <thead>
          <tr>
            <th scope="col">{t('planPrice')}</th>
            {years.map((row) => (
              <th scope="col" key={row.year}>
                {t(row.ongoing ? 'fromYearShort' : 'year', { year: row.year })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.key}>
              <td>
                <div className={styles.stack}>
                  <b>{t(plan.key)}</b>
                  <span className={styles.hint}>
                    {t(plan.project ? 'projectPrice' : 'annualPrice', {
                      amount: revenueMoney(plan.amount),
                    })}
                  </span>
                </div>
              </td>
              {years.map((row) => {
                const amounts = policyPlanAmounts(plan.amount, row.rate);
                return (
                  <td key={row.year}>
                    <div className={styles.stack}>
                      <b className={styles.director}>{revenueMoney(amounts.directorAmount)}</b>
                      <span className={styles.amountHint}>
                        {t('mediaSoftAmount', { amount: revenueMoney(amounts.mediaSoftAmount) })}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
