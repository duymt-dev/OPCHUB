'use client';
import { useTranslations } from 'next-intl';
import type { RegionalShareSummary } from '@opchub/shared/api-domains';
import { affiliateDate, affiliateMoney } from '../../format';
import styles from './regional-share.module.css';
export function RegionalShareKpis({ kpi }: { kpi: RegionalShareSummary['kpi'] }) {
  const t = useTranslations('affiliate.regional.share');
  const cards = [
    {
      key: 'total',
      value: kpi.total,
      hint: t('totalHint', { count: kpi.count, affiliates: kpi.affiliates }),
    },
    { key: 'due', value: kpi.due, hint: t('dueHint', { date: affiliateDate(kpi.payoutDate) }) },
    { key: 'paid', value: kpi.paid, hint: t('paidHint') },
  ] as const;
  return (
    <div className={styles.kpis}>
      {cards.map((c) => (
        <div key={c.key}>
          <span>{t(`kpi${c.key}`)}</span>
          <b data-testid={`regional-kpi-${c.key}`}>{affiliateMoney(c.value)}</b>
          <small>{c.hint}</small>
        </div>
      ))}
    </div>
  );
}
