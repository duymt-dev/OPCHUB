'use client';

import { Select } from 'antd';
import { useTranslations } from 'next-intl';
import { affiliateMonthLabel } from '../model';
import { agentMonthOptions } from '../agent-month-options';
import type { AffiliateAgentMonthSelectProps } from '../types';
import styles from './affiliate.module.css';

export function AgentMonthSelect({ value, onChange }: AffiliateAgentMonthSelectProps) {
  const t = useTranslations('affiliate');
  return (
    <label className={styles.month} data-ro-ok data-affiliate-period>
      {t('month')}
      <Select
        aria-label={t('month')}
        value={value}
        options={[
          { value: 'all', label: t('allMonths') },
          ...agentMonthOptions(value).map((month) => ({
            value: month,
            label: t('monthOption', { month: affiliateMonthLabel(month) }),
          })),
        ]}
        onChange={onChange}
      />
    </label>
  );
}
