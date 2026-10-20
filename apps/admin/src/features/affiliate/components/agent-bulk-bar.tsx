'use client';

import { BulkBar } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { AffiliateAgentBulkBarProps } from '../types';
import layout from './bulk-layout.module.css';

export function AgentBulkBar({
  count,
  onClear,
  onEdit,
  onExport,
  exportLoading,
}: AffiliateAgentBulkBarProps) {
  const t = useTranslations('affiliate');
  if (count <= 0) return null;
  return (
    <div className={layout.bulk}>
      <BulkBar
        count={count}
        unit=""
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
    </div>
  );
}
