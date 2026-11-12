'use client';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';
import type { RegionalShareSummary } from '@opchub/shared/api-domains';
import { affiliateDate } from '../../format';
import { regionalMinYear } from '@opchub/shared';
import styles from './regional-share.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function RegionalShareToolbar({
  q,
  onQ,
  rule,
  payoutDate,
}: {
  q: string;
  onQ: (q: string) => void;
  rule: RegionalShareSummary['rule'];
  payoutDate: string;
}) {
  const numberText = useNumberText();
  const locale = useLocale();
  const t = useTranslations('affiliate.regional.share');
  const first = rule.years[0]?.percent ?? rule.min;
  const minYear = regionalMinYear({
    regionalFirstYear: first,
    regionalStep: first - (rule.years[1]?.percent ?? first),
    regionalMin: rule.min,
  });
  const text =
    rule.years
      .map((r) => t('yearRule', { percent: numberText(r.percent), year: numberText(r.year) }))
      .join(' · ') +
    ` · ${minYear === null ? t('minRuleNever', { percent: numberText(rule.min) }) : t('minRule', { percent: numberText(rule.min), year: numberText(minYear) })}`;
  return (
    <div className={styles.toolbar}>
      <Input
        prefix={<SearchOutlined />}
        placeholder={t('search')}
        aria-label={t('search')}
        value={q}
        onChange={(e) => onQ(e.target.value)}
        maxLength={100}
      />
      <span>{t('rule', { rule: text, date: affiliateDate(payoutDate, locale) })}</span>
    </div>
  );
}
