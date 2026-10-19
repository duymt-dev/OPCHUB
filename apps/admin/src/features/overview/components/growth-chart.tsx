'use client';

import { useTranslations } from 'next-intl';
import { barHeight, chartAxis, chartMax, formatCount, growthPct } from '../data';
import { useOverview } from '../hooks/use-overview';
import styles from './overview.module.css';

/** Biểu đồ cột chồng tăng trưởng thành viên theo tháng */
export function GrowthChart() {
  const t = useTranslations('overview.growth');
  const data = useOverview().data;
  const rows = data?.growth ?? [];
  const max = chartMax(rows);
  return (
    <div className={`${styles.card} ${styles.growth}`}>
      <div className={styles.growthHead}>
        <div className={styles.growthTitle}>{t('title')}</div>
        <div className={styles.periods}>
          <span>{t('week')}</span>
          <span className={styles.periodOn}>{t('month')}</span>
          <span>{t('year')}</span>
        </div>
      </div>
      <div className={styles.summary}>
        <div className={styles.total}>{data ? formatCount(data.members.value) : '—'}</div>
        <span className={styles.deltaChip}>
          {t('delta', { pct: formatCount(data?.membersDeltaPct ?? 0) })}
        </span>
        <span className={styles.deltaNote}>
          {t('deltaNote', { n: formatCount(data?.newThisMonth ?? 0) })}
        </span>
        <div className={styles.legend}>
          <span>
            <i style={{ background: '#1677FF' }} />
            {t('active')}
          </span>
          <span>
            <i style={{ background: '#69B1FF' }} />
            {t('new')}
          </span>
          <span>
            <i style={{ background: '#BAE0FF' }} />
            {t('inactive')}
          </span>
        </div>
      </div>
      <div className={styles.chart}>
        <div className={styles.axis}>
          {chartAxis(max).map((v) => (
            <span key={v}>{formatCount(v)}</span>
          ))}
        </div>
        <div className={styles.bars}>
          {rows.map(({ month: m, active: a, fresh: b, inactive: c }) => (
            <div key={m} className={styles.barCol}>
              <div className={styles.barStack}>
                <div className={styles.pct}>{growthPct(a, b)}</div>
                <div style={{ height: barHeight(c, max), background: '#BAE0FF' }} />
                <div style={{ height: barHeight(b, max), background: '#69B1FF' }} />
                <div style={{ height: barHeight(a, max), background: '#1677FF' }} />
              </div>
              <div className={styles.month}>{m}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
