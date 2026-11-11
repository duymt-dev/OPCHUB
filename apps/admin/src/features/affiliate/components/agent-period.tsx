'use client';

import { StatusTag } from '@opchub/ui';
import { useLocale, useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import type { AffiliateAgentPeriodProps, AffiliateAgentPeriodStatusProps } from '../types';
import shared from './affiliate.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function AgentPeriodAmount({ period }: AffiliateAgentPeriodProps) {
  const numberText = useNumberText();
  const locale = useLocale();
  const t = useTranslations('affiliate');
  return (
    <div className={shared.stack}>
      <b>{affiliateMoney(period.commission, locale)}</b>
      <span className={shared.hint}>
        {t('periodCustomers', { count: numberText(period.customers) })}
      </span>
    </div>
  );
}

export function AgentPeriodStatus({ status }: AffiliateAgentPeriodStatusProps) {
  const t = useTranslations('affiliate.status');
  const label = status === 'recorded' ? 'unpaid' : status === 'none' ? 'void' : status;
  const tone = status === 'paid' ? 'green' : status === 'none' ? 'neutral' : 'amber';
  return (
    <StatusTag tone={tone} lineHeight={22}>
      {t(label)}
    </StatusTag>
  );
}
