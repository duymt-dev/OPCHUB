'use client';

import { BulkBar } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { CommissionBulkBarProps } from '../types';

export function CommissionBulkBar({
  count,
  onClear,
  onCancel,
  onExport,
  exportLoading,
}: CommissionBulkBarProps) {
  const t = useTranslations('affiliate');
  return (
    <BulkBar
      count={count}
      onClear={onClear}
      actions={
        <>
          <Button danger onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button loading={exportLoading} onClick={onExport}>
            {t('export')}
          </Button>
        </>
      }
    />
  );
}
