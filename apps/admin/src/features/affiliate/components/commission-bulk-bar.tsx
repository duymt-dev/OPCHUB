'use client';

import { BulkBar } from '@opchub/ui';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import type { CommissionBulkBarProps } from '../types';
import layout from './bulk-layout.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

export function CommissionBulkBar({
  count,
  onClear,
  onCancel,
  onExport,
  exportLoading,
}: CommissionBulkBarProps) {
  const ui = useAdminUiLabels();
  const t = useTranslations('affiliate');
  if (count <= 0) return null;
  return (
    <div className={layout.bulk}>
      <BulkBar
        {...ui.bulk}
        count={count}
        unit=""
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
    </div>
  );
}
