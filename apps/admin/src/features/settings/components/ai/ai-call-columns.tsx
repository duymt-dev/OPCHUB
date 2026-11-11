'use client';

import { Tag, type TableColumnsType } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { AI_PROVIDER_CATALOG, type AiCallItem } from '@opchub/shared/api-domains';
import { formatDate, formatNumber } from '@/i18n/format';

export function useAiCallColumns(): TableColumnsType<AiCallItem> {
  const t = useTranslations('settings.aiCalls');
  const locale = useLocale();
  return [
    {
      title: t('col.at'),
      dataIndex: 'at',
      render: (at: string) =>
        formatDate(at, locale, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        }),
    },
    {
      title: t('col.purpose'),
      dataIndex: 'purpose',
      render: (purpose: AiCallItem['purpose']) => t(`purpose.${purpose}`),
    },
    {
      title: t('col.provider'),
      dataIndex: 'provider',
      render: (provider: AiCallItem['provider']) => AI_PROVIDER_CATALOG[provider].name,
    },
    { title: t('col.model'), dataIndex: 'model' },
    {
      title: t('col.tokens'),
      render: (_: unknown, row) =>
        `${formatNumber(row.promptTokens, locale)} / ${formatNumber(row.completionTokens, locale)}`,
    },
    {
      title: t('col.cost'),
      dataIndex: 'cost',
      render: (cost: number) => formatNumber(cost, locale),
    },
    {
      title: t('col.latency'),
      dataIndex: 'latencyMs',
      render: (value: number) => formatNumber(value, locale),
    },
    {
      title: t('col.status'),
      dataIndex: 'status',
      render: (status: AiCallItem['status']) => (
        <Tag color={{ ok: 'green', error: 'red', fallback: 'orange' }[status]}>
          {t(`status.${status}`)}
        </Tag>
      ),
    },
    { title: t('col.error'), dataIndex: 'errorCode' },
    {
      title: t('col.actor'),
      render: (_: unknown, row) =>
        `${t(`realm.${row.actor?.realm ?? 'system'}`)} ${row.actor?.id ?? ''}`,
    },
  ];
}
