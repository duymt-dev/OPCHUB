'use client';

import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import layout from './policy-layout.module.css';

/** D-118/D-119: v4.6 edits sharing, not legacy reference-commission percentages. */
export function PolicyFields() {
  const t = useTranslations('affiliate');
  return (
    <>
      <Form.Item name="defaultRate" hidden>
        <InputNumber />
      </Form.Item>
      <Form.Item name="fundraisingRate" hidden>
        <InputNumber />
      </Form.Item>
      <Form.Item
        className={layout.cookie ?? ''}
        name="cookieDays"
        label={t('policy.cookie')}
        extra={t('policy.cookieHint')}
        rules={[{ required: true, type: 'integer', min: 1, max: 365 }]}
      >
        <InputNumber
          min={1}
          max={365}
          precision={0}
          controls={false}
          aria-label={t('policy.cookie')}
        />
      </Form.Item>
    </>
  );
}
