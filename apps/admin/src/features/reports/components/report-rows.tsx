'use client';

import type { ReportGroupRow, ReportProvinceRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmt } from '../model';
import { NoData } from './report-metrics';
import styles from './reports.module.css';

/** B2 khối C — một dòng / nhóm của tỉnh */
export function ReportGroupTable({ rows }: { rows: readonly ReportGroupRow[] }) {
  const t = useTranslations('reports');
  return (
    <section className={styles.card} aria-label={t('table.groups')}>
      <h2 className={styles.cardTitle}>{t('table.groups')}</h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('table.group')}</th>
              <th>{t('table.owner')}</th>
              <th className={styles.right}>{t('table.members')}</th>
              <th className={styles.right}>{t('table.messages')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.groupId}>
                <td>{r.name}</td>
                <td>{r.owner || <NoData />}</td>
                <td className={styles.right}>{fmt(r.members)}</td>
                <td className={styles.right}>{fmt(r.messages)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
    </section>
  );
}

const PROVINCE_KEYS = ['newMembers', 'totalMembers', 'events', 'feeRevenue'] as const;

/** B3 "BẢNG KPI THEO TỈNH" + dòng Tổng vùng (cùng công thức CSV) */
export function ReportProvinceTable({ rows }: { rows: readonly ReportProvinceRow[] }) {
  const t = useTranslations('reports');
  const total = (k: (typeof PROVINCE_KEYS)[number]) => rows.reduce((a, r) => a + r[k], 0);
  return (
    <section className={styles.card} aria-label={t('table.provinces')}>
      <h2 className={styles.cardTitle}>{t('table.provinces')}</h2>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('table.province')}</th>
              <th className={styles.right}>{t('metric.newMembers')}</th>
              <th className={styles.right}>{t('metric.totalMembers')}</th>
              <th className={styles.right}>{t('table.events')}</th>
              <th className={styles.right}>{t('table.revenue')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.province}>
                <td>{r.province}</td>
                {PROVINCE_KEYS.map((k) => (
                  <td key={k} className={styles.right}>
                    {fmt(r[k])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className={styles.totalRow} data-row="total">
              <td>{t('table.total')}</td>
              {PROVINCE_KEYS.map((k) => (
                <td key={k} className={styles.right}>
                  {fmt(total(k))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
