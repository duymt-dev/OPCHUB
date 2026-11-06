import type { AdminConversion } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatCount } from '../data';
import styles from './conversion.module.css';

export const conversionTone = (rate: number) =>
  rate >= 80 ? 'green' : rate >= 70 ? 'blue' : 'orange';
export function ConversionGrid({ data }: { data: AdminConversion }) {
  const t = useTranslations('overview.conversion');
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
              <td>{row.label}</td>
              <td>{row.directorName ?? t('unappointed')}</td>
              <td>{formatCount(row.trial)}</td>
              <td>{formatCount(row.paid)}</td>
              <td>{formatCount(row.expired)}</td>
              <td>
                <div className={styles.rate}>
                  <span className={styles.track}>
                    <span
                      className={styles[conversionTone(row.ratePct)]}
                      style={{ width: `${row.ratePct}%` }}
                    />
                  </span>
                  <b>{row.ratePct}%</b>
                </div>
              </td>
            </tr>
          ))}
          <tr className={styles.total}>
            <td>{t('total')}</td>
            <td />
            <td>{formatCount(data.total.trial)}</td>
            <td>{formatCount(data.total.paid)}</td>
            <td>{formatCount(data.total.expired)}</td>
            <td>{data.total.ratePct}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
