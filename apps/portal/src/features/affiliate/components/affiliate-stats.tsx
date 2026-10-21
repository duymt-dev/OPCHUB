'use client';

import type { ActiveAffiliate } from '../types';
import { useTranslations } from 'next-intl';
import { formatDate, formatVnd } from '@/features/membership';
import { endOfMonth, monthKey } from '../model';
import { useCalendarClock } from '../hooks/use-calendar-clock';
import styles from './affiliate.module.css';
import { fmtInt } from '@/i18n/format';

export function AffiliateStats({ stats: s }: { stats: ActiveAffiliate['stats'] }) {
  const t = useTranslations('affiliate.stats');
  const now = useCalendarClock();
  const date = formatDate(endOfMonth(monthKey(now)));
  const cards = [
    { label: t('clicks'), value: fmtInt(s.clicks30d), hint: t('clicksHint') },
    {
      label: t('paid'),
      value: String(s.paidCount),
      hint: t('conversion', { rate: s.conversionPct.toFixed(1) }),
    },
    {
      label: t('month'),
      value: formatVnd(s.thisMonth),
      hint: t('payDate', { date }),
      highlight: true,
    },
    {
      label: t('carry'),
      value: formatVnd(s.carryOver),
      hint: s.carryOver ? t('carryHint', { date }) : t('noCarry'),
    },
    { label: t('received'), value: formatVnd(s.received), hint: t('receivedHint') },
  ];
  return (
    <div className={styles.stats}>
      {cards.map((c) => (
        <div key={c.label} className={`${styles.stat} ${c.highlight ? styles.highlight : ''}`}>
          <span>{c.label}</span>
          <b>{c.value}</b>
          <small>{c.hint}</small>
        </div>
      ))}
    </div>
  );
}
