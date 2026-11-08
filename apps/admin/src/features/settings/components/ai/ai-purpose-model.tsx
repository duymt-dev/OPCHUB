'use client';
import { AutoComplete } from 'antd';
import { useTranslations } from 'next-intl';
import { AI_PROVIDER_CATALOG, type AiPurpose } from '@opchub/shared/api-domains';
import type { AiPanel } from './types';
import styles from './ai-purpose-model.module.css';

export function AiPurposeModel({ p, purpose }: { p: AiPanel; purpose: AiPurpose }) {
  const t = useTranslations('settings.ai');
  if (!p.form) return null;
  const form = p.form;
  const selected = form.use[purpose];
  return (
    <AutoComplete
      aria-label={t('purposeModel', { purpose })}
      className={styles.model ?? ''}
      placeholder={t('providerDefault')}
      value={form.models?.[purpose] ?? ''}
      disabled={p.busy || !selected}
      maxLength={200}
      options={selected ? AI_PROVIDER_CATALOG[selected].models.map((value) => ({ value })) : []}
      onChange={(value: string) => {
        const models = { ...form.models };
        if (value.trim()) models[purpose] = value;
        else delete models[purpose];
        p.set({ models });
      }}
    />
  );
}
