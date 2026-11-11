'use client';

import { useLocale, useTranslations } from 'next-intl';
import { barHeight, chartAxis, chartMax, formatCount, growthPct } from '../data';
import { useOverview } from '../hooks/use-overview';
import { useOverviewUrl } from '../hooks/use-overview-url';
import styles from './overview.module.css';
import { seriesLabel } from '../series-labels';
import { useNumberText } from '@/i18n/use-number-text';

interface PeriodTabsProps {
  current: string;
  onChange: (period: 'week' | 'month' | 'year') => void;
  label: string;
  labels: { week: string; month: string; year: string };
}

function PeriodTabs({ current, onChange, label, labels }: PeriodTabsProps) {
  const tabs: Array<{ id: 'week' | 'month' | 'year'; text: string }> = [
    { id: 'week', text: labels.week },
    { id: 'month', text: labels.month },
    { id: 'year', text: labels.year },
  ];
  return (
    <div className={styles.periods} role="tablist" aria-label={label}>
      {tabs.map(({ id, text }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={current === id}
          tabIndex={current === id ? 0 : -1}
          onKeyDown={(event) => {
            const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (!step && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? 2
                  : (tabs.findIndex((t) => t.id === id) + step + 3) % 3;
            const target = tabs[next];
            if (target) onChange(target.id);
            (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
          }}
          className={`${styles.periodBtn} ${current === id ? styles.periodOn : ''}`}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Biểu đồ cột chồng tăng trưởng thành viên theo tháng; số tổng = thành viên đã kích hoạt phí (v4) */
export function GrowthChart() {
  const numberText = useNumberText();
  const t = useTranslations('overview.growth');
  const chart = useTranslations('ui');
  const locale = useLocale();
  const data = useOverview().data;
  const { params, update } = useOverviewUrl();
  const currentPeriod = params.period ?? 'month';
  const rows = data?.growth ?? [];
  const max = chartMax(rows);
  return (
    <div className={`${styles.card} ${styles.growth}`}>
      <div className={styles.growthHead}>
        <div className={styles.growthTitle}>{t('title')}</div>
        <PeriodTabs
          current={currentPeriod}
          onChange={(period) => update({ period })}
          label={t('title')}
          labels={{ week: t('week'), month: t('month'), year: t('year') }}
        />
      </div>
      <div className={styles.summary}>
        <div className={styles.total}>{data ? formatCount(data.paid.value, locale) : '—'}</div>
        <span className={styles.deltaChip}>
          {t('delta', { pct: formatCount(Math.round(data?.paid.deltaPct ?? 0), locale) })}
        </span>
        <span className={styles.deltaNote}>
          {t(params.from ? 'rangeDeltaNote' : 'deltaNote', {
            n: formatCount(data?.paid.newThisMonth ?? 0, locale),
          })}
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
            <span key={v}>{formatCount(v, locale)}</span>
          ))}
        </div>
        <div className={styles.bars} data-m="bars">
          {rows.map(({ month: m, active: a, fresh: b, inactive: c }) => (
            <div key={m} className={styles.barCol}>
              <div className={styles.barStack}>
                <div className={styles.pct}>{growthPct(a, b, locale)}</div>
                <div style={{ height: barHeight(c, max), background: '#BAE0FF' }} />
                <div style={{ height: barHeight(b, max), background: '#69B1FF' }} />
                <div style={{ height: barHeight(a, max), background: '#1677FF' }} />
              </div>
              <div className={styles.month}>
                {seriesLabel(m, currentPeriod, {
                  month: (n) => chart('chart.month', { n: numberText(n) }),
                  week: (n) => chart('chart.week', { n: numberText(n) }),
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
