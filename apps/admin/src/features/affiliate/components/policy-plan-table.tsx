'use client';
import { regionalAmount, regionalPercent } from '@opchub/shared';
import { useLocale, useTranslations } from 'next-intl';
import { usePrices } from '@/lib/use-prices';
import { usePolicyPreview } from '../hooks/use-policy-preview';
import { affiliateMoney } from '../format';
import styles from './policy-reference.module.css';

export function PolicyPlanTable() {
  const locale = useLocale();
  const t = useTranslations('affiliate.policy');
  const policy = usePolicyPreview();
  const prices = usePrices();
  const plans = [
    { key: 'personal', amount: prices?.per.y },
    { key: 'business', amount: prices?.biz.y },
    { key: 'fundraisingPlan', amount: prices?.fund.p },
  ] as const;
  return (
    <>
      <b>{t('planTitle')}</b>
      <div className={styles.scroll}>
        <table className={styles.plans} aria-label={t('planTitle')}>
          <thead>
            <tr>
              <th>{t('planPrice')}</th>
              {[1, 2, 3, 4].map((year) => (
                <th key={year}>{t(year === 4 ? 'fromFourth' : 'year', { year })}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.key}>
                <td>
                  <b>{t(plan.key)}</b>
                  <small>
                    {plan.amount === undefined
                      ? '—'
                      : `${affiliateMoney(plan.amount, locale)} ${t(plan.key === 'fundraisingPlan' ? 'perProject' : 'perYear')}`}
                  </small>
                </td>
                {[1, 2, 3, 4].map((year) => {
                  const amount =
                    policy && plan.amount !== undefined
                      ? regionalAmount(plan.amount, regionalPercent(year, policy))
                      : null;
                  return (
                    <td key={year}>
                      <b className={styles.blue}>
                        {amount ? affiliateMoney(amount.directorAmount, locale) : '—'}
                      </b>
                      <small>
                        {amount
                          ? t('mediaAmount', {
                              amount: affiliateMoney(amount.mediaSoftAmount, locale),
                            })
                          : '—'}
                      </small>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
