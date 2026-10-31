'use client';

import { useTranslations } from 'next-intl';
import { previewPolicy } from '../policy-preview';
import layout from './policy-layout.module.css';

export function PolicyRules({ values }: { values: unknown }) {
  const t = useTranslations('affiliate.policyPreview');
  const policy = previewPolicy(values);
  return policy ? (
    <div className={layout.rules}>
      {t(
        policy.annualDecrease === 0 || policy.yearOneRate === policy.minimumRate
          ? 'constantRules'
          : 'rules',
        {
          first: policy.yearOneRate,
          mediaSoft: 100 - policy.yearOneRate,
          decrease: policy.annualDecrease,
          floor: policy.minimumRate,
        },
      )}
    </div>
  ) : null;
}
