'use client';

import { useTranslations } from 'next-intl';
import { barHeight, growthPct, GROWTH_MONTHS } from '../data';
import styles from './overview.module.css';

const AXIS = ['600', '400', '200', '0'];

/** Biểu đồ cột chồng tăng trưởng thành viên theo tháng */
export function GrowthChart() {
  const t = useTranslations('overview.growth');
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
        <div className={styles.total}>{t('total')}</div>
        <span className={styles.deltaChip}>{t('delta')}</span>
        <span className={styles.deltaNote}>{t('deltaNote')}</span>
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
          {AXIS.map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <div className={styles.bars}>
          {GROWTH_MONTHS.map(([m, a, b, c]) => (
            <div key={m} className={styles.barCol}>
              <div className={styles.barStack}>
                <div className={styles.pct}>{growthPct(a, b)}</div>
                <div style={{ height: barHeight(c), background: '#BAE0FF' }} />
                <div style={{ height: barHeight(b), background: '#69B1FF' }} />
                <div style={{ height: barHeight(a), background: '#1677FF' }} />
              </div>
              <div className={styles.month}>{m}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
