'use client';
import { Input, Select, Space } from 'antd';
import { useTranslations } from 'next-intl';
import { AI_PROVIDER_IDS, AI_PURPOSES, type AiCallsFilter } from '@opchub/shared/api-domains';
import { useAiProviderLabel } from '../../hooks/use-ai-provider-label';

const date = (iso: string) => new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 10);
export function AiCallFilters({
  value,
  onChange,
}: {
  value: AiCallsFilter;
  onChange: (next: AiCallsFilter) => void;
}) {
  const t = useTranslations('settings.aiCalls');
  const providerLabel = useAiProviderLabel();
  const choice = <K extends 'purpose' | 'provider' | 'status'>(key: K, next: AiCallsFilter[K]) => {
    const patch = { ...value };
    if (next) patch[key] = next;
    else delete patch[key];
    onChange(patch);
  };
  return (
    <Space wrap>
      <Input
        type="date"
        aria-label={t('from')}
        value={date(value.from)}
        onChange={(e) => {
          if (e.target.value) onChange({ ...value, from: `${e.target.value}T00:00:00+07:00` });
        }}
      />
      <Input
        type="date"
        aria-label={t('to')}
        value={date(value.to)}
        onChange={(e) => {
          if (e.target.value) onChange({ ...value, to: `${e.target.value}T23:59:59.999+07:00` });
        }}
      />
      <Select
        virtual={false}
        aria-label={t('purposeLabel')}
        placeholder={t('purposePh')}
        allowClear
        value={value.purpose}
        options={AI_PURPOSES.map((key) => ({ value: key, label: t(`purpose.${key}`) }))}
        onChange={(next) => choice('purpose', next)}
      />
      <Select
        virtual={false}
        aria-label={t('providerLabel')}
        placeholder={t('providerPh')}
        allowClear
        value={value.provider}
        options={AI_PROVIDER_IDS.map((key) => ({
          value: key,
          label: providerLabel(key),
        }))}
        onChange={(next) => choice('provider', next)}
      />
      <Select
        virtual={false}
        aria-label={t('statusLabel')}
        placeholder={t('statusPh')}
        allowClear
        value={value.status}
        options={(['ok', 'error', 'fallback'] as const).map((value) => ({
          value,
          label: t(`status.${value}`),
        }))}
        onChange={(next) => choice('status', next)}
      />
    </Space>
  );
}
