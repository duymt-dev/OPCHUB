'use client';

import { useTranslations } from 'next-intl';
import layout from './policy-layout.module.css';

/** D-94 3A (v4.2): % mặc định hiện hành trong câu "mọi thành viên … với % mặc định {rate}%" */
export function PolicyRules({ rate }: { rate: number }) {
  const t = useTranslations('affiliate');
  return <div className={layout.rules}>{t('policy.ruleText', { rate })}</div>;
}
