'use client';

import { Modal } from '@opchub/ui';
import { Button, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import styles from './affiliate.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

export function RateDialog({
  ids,
  initialRate = 20,
  onClose,
}: {
  ids: string[];
  initialRate?: number;
  onClose: () => void;
}) {
  const ui = useAdminUiLabels();
  const t = useTranslations('affiliate');
  const [rate, setRate] = useState<number | null>(initialRate);
  const { rates } = useAffiliateWrites();
  const id = useId();
  const valid = rate !== null && Number.isInteger(rate) && rate >= 1 && rate <= 50;
  const submit = () => {
    if (valid)
      void rates
        .mutateAsync({ ids, rate })
        .then((result) => {
          if (result) onClose();
        })
        .catch(() => undefined);
  };
  return (
    <Modal
      closeLabel={ui.close}
      open
      title={t('rateTitle')}
      onClose={onClose}
      size="small"
      dismissible={!rates.isPending}
      maskClosable={!rates.isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={rates.isPending}>
            {t('close')}
          </Button>
          <Button
            type="primary"
            loading={rates.isPending}
            disabled={!valid || ids.length === 0}
            onClick={submit}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <div className={styles.stack}>
        <label htmlFor={id}>{t('rateLabel')}</label>
        <InputNumber
          id={id}
          value={rate}
          onChange={setRate}
          min={1}
          max={50}
          precision={0}
          disabled={rates.isPending}
        />
        {!valid ? <span role="alert">{t('rateError')}</span> : null}
        <span className={styles.hint}>{t('rateChangeHint')}</span>
      </div>
    </Modal>
  );
}
