'use client';

import { useTranslations } from 'next-intl';
import type { RevenueSharingPolicy } from '@opchub/shared/api-domains';
import type { PolicyYear } from '../types';
import styles from './revenue-policy-tables.module.css';

export function RevenuePolicyYears({
  years,
  policy,
}: {
  years: PolicyYear[];
  policy: RevenueSharingPolicy;
}) {
  const t = useTranslations('affiliate.policyPreview');
  return (
    // Keyboard users must be able to focus and horizontally scroll the real table on mobile.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={styles.scroll} role="region" aria-label={t('yearsTitle')} tabIndex={0}>
      <table className={styles.years}>
        <thead>
          <tr>
            <th scope="col">{t('customerYear')}</th>
            <th scope="col">{t('mediaSoft')}</th>
            <th scope="col">{t('director')}</th>
            <th scope="col">{t('ratio')}</th>
          </tr>
        </thead>
        <tbody>
          {years.map((row) => (
            <tr key={row.year}>
              <td>
                <div className={styles.stack}>
                  <b
                    className={
                      row.ongoing ? styles.ongoing : row.year === 1 ? styles.first : styles.renewal
                    }
                  >
                    {t(row.ongoing ? 'fromYear' : row.year === 1 ? 'firstYear' : 'renewalYear', {
                      year: row.year,
                    })}
                  </b>
                  <span className={styles.hint}>
                    {t(row.ongoing ? 'floorHint' : row.year === 1 ? 'firstHint' : 'decreaseHint', {
                      rate: row.rate,
                      decrease: policy.annualDecrease,
                    })}
                  </span>
                </div>
              </td>
              <td>
                <b className={styles.percent}>{row.mediaSoft}%</b>
              </td>
              <td>
                <b className={`${styles.percent} ${styles.director}`}>{row.rate}%</b>
              </td>
              <td>
                <span className={styles.ratio}>
                  {row.mediaSoft} / {row.rate}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
