'use client';

import { BulkBar } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { AffiliateAgentBulkBarProps } from '../types';

export function AgentBulkBar({
  count,
  onClear,
  onEdit,
  onExport,
  exportLoading,
}: AffiliateAgentBulkBarProps) {
  const t = useTranslations('affiliate');
  return (
    <BulkBar
      count={count}
      onClear={onClear}
      actions={
        <>
          <Button onClick={onEdit}>{t('rate')}</Button>
          <Button loading={exportLoading} onClick={onExport}>
            {t('export')}
          </Button>
        </>
      }
    />
  );
}
