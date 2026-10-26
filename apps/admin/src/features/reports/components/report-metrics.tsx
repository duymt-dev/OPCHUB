'use client';

import type { ReportMetrics, ReportTemplate } from '@opchub/shared/api-domains';
import { Tooltip } from 'antd';
import { useTranslations } from 'next-intl';
import { fmt, KPI_KEYS, METRIC_ROWS } from '../model';
import styles from './reports.module.css';

/** Ô chỉ số chưa có nguồn dữ liệu: "—" + tooltip (không bịa số — D-78) */
export function NoData() {
  const t = useTranslations('reports');
  return (
    <Tooltip title={t('noData')}>
      <span className={styles.noData} aria-label={t('noData')}>
        —
      </span>
    </Tooltip>
  );
}

/** 4 thẻ đầu của mẫu (giá trị "Thực hiện") */
export function ReportKpis({
  template,
  m,
}: {
  template: ReportTemplate;
  m: ReportMetrics | undefined;
}) {
  const t = useTranslations('reports.metric');
  return (
    <div className={styles.kpis}>
      {KPI_KEYS[template].map((k) => (
        <div key={k} className={styles.kpi} data-kpi={k}>
          <span className={styles.kpiLabel}>{t(k)}</span>
          <b className={styles.kpiValue}>{m ? fmt(m[k]) : '—'}</b>
        </div>
      ))}
    </div>
  );
}

/** Bảng chỉ số đầy đủ theo thứ tự mẫu: Chỉ số | Thực hiện */
export function ReportMetricTable({ template, m }: { template: ReportTemplate; m: ReportMetrics }) {
  const t = useTranslations('reports');
  return (
    <section className={styles.card} aria-label={t('table.metrics')}>
      <h2 className={styles.cardTitle}>{t('table.metrics')}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('table.metric')}</th>
            <th className={styles.right}>{t('table.actual')}</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS[template].map((r) => (
            <tr key={r.key} data-metric={r.key}>
              <td>{t(`metric.${r.key}`)}</td>
              <td className={styles.right}>{'empty' in r ? <NoData /> : fmt(m[r.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
