'use client';

import { Button, Form } from 'antd';
import { useTranslations } from 'next-intl';
import { useAffiliatePolicyForm } from '../hooks/use-affiliate-policy-form';
import type { AffiliatePolicyFormProps } from '../types';
import { PolicyFields } from './policy-fields';
import { RevenuePolicyFields } from './revenue-policy-fields';
import { PolicyRules } from './policy-rules';
import { PolicyTerms } from './policy-terms';
import layout from './policy-layout.module.css';

export function PolicyForm({ value }: AffiliatePolicyFormProps) {
  const t = useTranslations('affiliate');
  const { form, policy, submit } = useAffiliatePolicyForm();
  return (
    <Form
      form={form}
      initialValues={value}
      layout="vertical"
      aria-label={t('tabs.cfg')}
      requiredMark={false}
      className={layout.form ?? ''}
      onFinish={submit}
      disabled={policy.isPending}
    >
      <RevenuePolicyFields />
      <PolicyFields />
      <PolicyRules rate={value.defaultRate} />
      <div className={layout.actions}>
        <Button type="primary" htmlType="submit" loading={policy.isPending}>
          {t('policy.save')}
        </Button>
        <PolicyTerms />
      </div>
    </Form>
  );
}
