'use client';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';
import type { RegionalShareSummary } from '@opchub/shared/api-domains';
import { affiliateDate } from '../../format';
import { regionalMinYear } from '@opchub/shared';
import styles from './regional-share.module.css';
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
  const locale = useLocale();
  const t = useTranslations('affiliate.regional.share');
  const first = rule.years[0]?.percent ?? rule.min;
  const minYear = regionalMinYear({
    regionalFirstYear: first,
    regionalStep: first - (rule.years[1]?.percent ?? first),
    regionalMin: rule.min,
  });
  const text =
    rule.years.map((r) => t('yearRule', { percent: r.percent, year: r.year })).join(' · ') +
    ` · ${minYear === null ? t('minRuleNever', { percent: rule.min }) : t('minRule', { percent: rule.min, year: minYear })}`;
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
