'use client';

import { Form, Input, InputNumber, Switch } from 'antd';
import { useTranslations } from 'next-intl';
import type { LlmConfig } from '@opchub/shared/api-domains';
import styles from './llm.module.css';

export function LlmFields({ saved }: { saved: LlmConfig }) {
  const t = useTranslations('settings.llm');
  return (
    <>
      <Form.Item name="baseUrl" label={t('baseUrl')}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="model" label={t('model')}>
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item name="key" label={t('key')} extra={t('keyHint')}>
        <Input.Password
          autoComplete="new-password"
          placeholder={saved.hasKey ? t('keySaved', { last4: saved.keyLast4 ?? '••••' }) : ''}
        />
      </Form.Item>
      <div className={styles.grid}>
        <Form.Item name="maxTokens" label={t('maxTokens')}>
          <InputNumber min={16} max={1024} precision={0} />
        </Form.Item>
        <Form.Item name="timeoutMs" label={t('timeoutMs')}>
          <InputNumber min={1000} max={120000} precision={0} />
        </Form.Item>
      </div>
      <Form.Item name="enabled" label={t('enabled')} valuePropName="checked">
        <Switch aria-label={t('enabled')} />
      </Form.Item>
    </>
  );
}
