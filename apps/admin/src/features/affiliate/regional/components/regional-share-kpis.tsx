'use client';
import { useLocale, useTranslations } from 'next-intl';
import type { RegionalShareSummary } from '@opchub/shared/api-domains';
import { affiliateDate, affiliateMoney } from '../../format';
import styles from './regional-share.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function RegionalShareKpis({ kpi }: { kpi: RegionalShareSummary['kpi'] }) {
  const numberText = useNumberText();
  const locale = useLocale();
  const t = useTranslations('affiliate.regional.share');
  const cards = [
    {
      key: 'total',
      value: kpi.total,
      hint: t('totalHint', {
        count: numberText(kpi.count),
        affiliates: numberText(kpi.affiliates),
      }),
    },
    {
      key: 'due',
      value: kpi.due,
      hint: t('dueHint', { date: affiliateDate(kpi.payoutDate, locale) }),
    },
    { key: 'paid', value: kpi.paid, hint: t('paidHint') },
  ] as const;
  return (
    <div className={styles.kpis}>
      {cards.map((c) => (
        <div key={c.key}>
          <span>{t(`kpi${c.key}`)}</span>
          <b data-testid={`regional-kpi-${c.key}`}>{affiliateMoney(c.value, locale)}</b>
          <small>{c.hint}</small>
        </div>
      ))}
    </div>
  );
}
