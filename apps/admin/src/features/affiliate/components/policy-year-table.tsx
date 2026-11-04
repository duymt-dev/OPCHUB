'use client';
import { regionalMinYear, regionalPercent, type RegionalPolicy } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import { usePolicyPreview } from '../hooks/use-policy-preview';
import styles from './policy-reference.module.css';

export function policyYears(policy: RegionalPolicy) {
  const minimum = regionalMinYear(policy);
  if (minimum === null) return [{ year: 1, last: true, percent: regionalPercent(1, policy) }];
  const end = Math.max(2, minimum);
  return Array.from({ length: end }, (_, i) => ({
    year: i + 1,
    last: i + 1 === end,
    percent: regionalPercent(i + 1, policy),
  }));
}
export function PolicyYearTable() {
  const t = useTranslations('affiliate.policy');
  const policy = usePolicyPreview();
  return (
    <div className={styles.scroll}>
      <table className={styles.years} aria-label={t('customerYear')}>
        <thead>
          <tr>
            {(['customerYear', 'mediaSoft', 'director', 'ratio'] as const).map((k) => (
              <th key={k}>{t(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {policy ? (
            policyYears(policy).map((row) => (
              <tr key={row.year}>
                <td>
                  <b>
                    {row.last
                      ? t('fromYear', { year: row.year })
                      : t(row.year === 1 ? 'firstYear' : 'renewalYear', { year: row.year })}
                  </b>
                  <small>
                    {row.last
                      ? t('floorHint', { percent: row.percent })
                      : row.year === 1
                        ? t('firstHint')
                        : t('stepHint', { step: policy.regionalStep })}
                  </small>
                </td>
                <td>
                  <strong>{100 - row.percent}%</strong>
                </td>
                <td>
                  <strong className={styles.blue}>{row.percent}%</strong>
                </td>
                <td>
                  <span className={styles.ratio}>
                    {100 - row.percent} / {row.percent}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
