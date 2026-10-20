'use client';

import { Form, Input, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import layout from './policy-layout.module.css';

export function PolicyFields() {
  const t = useTranslations('affiliate');
  return (
    <>
      <div className={layout.fields}>
        <Form.Item
          name="defaultRate"
          label={t('policy.rate')}
          rules={[{ required: true, type: 'integer', min: 1, max: 50 }]}
        >
          <InputNumber min={1} max={50} precision={0} aria-label={t('policy.rate')} />
        </Form.Item>
        <Form.Item
          name="cookieDays"
          label={t('policy.cookie')}
          extra={t('policy.cookieHint')}
          rules={[{ required: true, type: 'integer', min: 1, max: 365 }]}
        >
          <InputNumber min={1} max={365} precision={0} aria-label={t('policy.cookie')} />
        </Form.Item>
      </div>
      <Form.Item name="terms" label={t('policy.terms')} rules={[{ max: 5000 }]}>
        <Input.TextArea rows={4} maxLength={5000} aria-label={t('policy.terms')} />
      </Form.Item>
    </>
  );
}
