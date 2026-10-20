'use client';

import { affiliatePolicySchema, type AffiliatePolicy } from '@opchub/shared/api-domains';
import { Button, Form, Input, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import styles from './affiliate.module.css';

export function PolicyForm({ value }: { value: AffiliatePolicy }) {
  const t = useTranslations('affiliate');
  const [form] = Form.useForm<AffiliatePolicy>();
  const writes = useAffiliateWrites();
  const submit = (values: AffiliatePolicy) => {
    const result = affiliatePolicySchema.safeParse(values);
    if (!result.success) {
      form.setFields(
        result.error.issues.flatMap((issue) => {
          const key = issue.path[0];
          if (key !== 'defaultRate' && key !== 'cookieDays' && key !== 'terms') return [];
          return [{ name: key, errors: [issue.message] }];
        }),
      );
      return;
    }
    writes.policy.mutate(result.data);
  };
  return (
    <Form
      form={form}
      initialValues={value}
      layout="vertical"
      className={styles.form}
      onFinish={submit}
      disabled={writes.policy.isPending}
    >
      <div className={styles.fields}>
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
      <div className={styles.rules}>
        <b>{t('policy.rules')}</b>
        <ul>
          {(['ruleAuto', 'ruleFirst', 'rulePause', 'rulePayout'] as const).map((key) => (
            <li key={key}>{t(`policy.${key}`)}</li>
          ))}
        </ul>
      </div>
      <div>
        <Button type="primary" htmlType="submit" loading={writes.policy.isPending}>
          {t('policy.save')}
        </Button>
      </div>
    </Form>
  );
}
