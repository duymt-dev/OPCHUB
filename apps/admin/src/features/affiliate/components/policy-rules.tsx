'use client';
import { useTranslations } from 'next-intl';
import { usePolicyPreview } from '../hooks/use-policy-preview';
import layout from './policy-layout.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function PolicyRules() {
  const numberText = useNumberText();
  const t = useTranslations('affiliate');
  const p = usePolicyPreview();
  return (
    <div className={layout.rules}>
      {p
        ? t('policy.ruleText', {
            ms1: numberText(100 - p.regionalFirstYear),
            g1: numberText(p.regionalFirstYear),
            step: numberText(p.regionalStep),
            min: numberText(p.regionalMin),
          })
        : '—'}
    </div>
  );
}
