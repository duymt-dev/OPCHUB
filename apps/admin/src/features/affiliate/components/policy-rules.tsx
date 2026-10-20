'use client';

import { useTranslations } from 'next-intl';
import layout from './policy-layout.module.css';

export function PolicyRules() {
  const t = useTranslations('affiliate');
  return <div className={layout.rules}>{t('policy.ruleText')}</div>;
}
