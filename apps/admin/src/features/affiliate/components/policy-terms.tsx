'use client';

import { Form, Input } from 'antd';
import { useTranslations } from 'next-intl';

/** Required by SRS; appended after the prototype's rules, still before Save. */
export function PolicyTerms() {
  const t = useTranslations('affiliate');
  return (
    <Form.Item name="terms" label={t('policy.terms')} rules={[{ max: 5000 }]}>
      <Input.TextArea rows={4} maxLength={5000} aria-label={t('policy.terms')} />
    </Form.Item>
  );
}
