'use client';

import { Form, InputNumber } from 'antd';
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
    </>
  );
}
