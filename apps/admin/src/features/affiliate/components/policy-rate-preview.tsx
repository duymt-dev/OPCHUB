'use client';

import { Form } from 'antd';
import { useTranslations } from 'next-intl';
import { affiliateMoney } from '../format';
import { useAffiliatePolicyPreview } from '../hooks/use-affiliate-policy-preview';

export function PolicyRatePreview() {
  const value: unknown = Form.useWatch('defaultRate');
  const { valid, data, isError } = useAffiliatePolicyPreview(value);
  const t = useTranslations('affiliate.policy');
  if (!valid) return null;
  return (
    <span aria-live="polite">
      {data
        ? t('preview', {
            commission: affiliateMoney(data.commission),
            feeAmount: affiliateMoney(data.feeAmount),
          })
        : t(isError ? 'previewUnavailable' : 'previewLoading')}
    </span>
  );
}
