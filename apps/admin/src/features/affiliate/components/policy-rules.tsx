'use client';
import { useTranslations } from 'next-intl';
import { usePolicyPreview } from '../hooks/use-policy-preview';
import layout from './policy-layout.module.css';
export function PolicyRules() {
  const t = useTranslations('affiliate');
  const p = usePolicyPreview();
  return (
    <div className={layout.rules}>
      {p
        ? t('policy.ruleText', {
            ms1: 100 - p.regionalFirstYear,
            g1: p.regionalFirstYear,
            step: p.regionalStep,
            min: p.regionalMin,
          })
        : '—'}
    </div>
  );
}
