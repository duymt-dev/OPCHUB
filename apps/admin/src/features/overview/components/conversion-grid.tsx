import type { AdminConversion } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { useDomainLabels } from '@/i18n/domain-labels';
import { formatPercentPoints } from '@/i18n/format';
import { formatCount } from '../data';
import styles from './conversion.module.css';

export const conversionTone = (rate: number) =>
  rate >= 80 ? 'green' : rate >= 70 ? 'blue' : 'orange';
export function ConversionGrid({ data }: { data: AdminConversion }) {
  const t = useTranslations('overview.conversion');
  const locale = useLocale();
  const labels = useDomainLabels();
  return (
    <div className={styles.scroll} role="region" aria-label={t('heading')}>
      <table className={styles.table}>
        <thead>
          <tr>
            {(['region', 'director', 'trial', 'paid', 'expired', 'rate'] as const).map((key) => (
              <th key={key}>{t(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.region}>
              <td>{labels.region(row.region)}</td>
              <td>{row.directorName ?? t('unappointed')}</td>
              <td>{formatCount(row.trial, locale)}</td>
              <td>{formatCount(row.paid, locale)}</td>
              <td>{formatCount(row.expired, locale)}</td>
              <td>
                <div className={styles.rate}>
                  <span className={styles.track}>
                    <span
                      className={styles[conversionTone(row.ratePct)]}
                      style={{ width: `${row.ratePct}%` }}
                    />
                  </span>
                  <b>{formatPercentPoints(row.ratePct, locale)}</b>
                </div>
              </td>
            </tr>
          ))}
          <tr className={styles.total}>
            <td>{t('total')}</td>
            <td />
            <td>{formatCount(data.total.trial, locale)}</td>
            <td>{formatCount(data.total.paid, locale)}</td>
            <td>{formatCount(data.total.expired, locale)}</td>
            <td>{formatPercentPoints(data.total.ratePct, locale)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
