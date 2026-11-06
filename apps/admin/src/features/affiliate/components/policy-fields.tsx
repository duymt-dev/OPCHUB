'use client';
import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { RegionalPolicyFields } from '../regional/components/regional-policy-fields';
import { PolicyYearTable } from './policy-year-table';
import { PolicyPlanTable } from './policy-plan-table';
import styles from './policy-reference.module.css';
export function PolicyFields() {
  const t = useTranslations('affiliate.policy');
  return (
    <>
      {['defaultRate', 'fundraisingRate', 'renewalRate', 'renewalMaxYear'].map((name) => (
        <Form.Item name={name} hidden key={name}>
          <InputNumber />
        </Form.Item>
      ))}
      <RegionalPolicyFields />
      <PolicyYearTable />
      <PolicyPlanTable />
      <Form.Item
        name="cookieDays"
        label={t('cookie')}
        extra={t('cookieHint')}
        rules={[{ required: true, type: 'integer', min: 1, max: 365 }]}
      >
        <InputNumber min={1} max={365} aria-label={t('cookie')} />
      </Form.Item>
      <p className={styles.note}>{t('shareNote')}</p>
    </>
  );
}
