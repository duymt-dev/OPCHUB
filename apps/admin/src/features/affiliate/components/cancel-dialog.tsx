'use client';

import { Modal } from '@opchub/ui';
import { Button, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useAffiliateWrites } from '../hooks/use-affiliate-writes';
import styles from './affiliate.module.css';

export function CancelDialog({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const t = useTranslations('affiliate');
  const [reason, setReason] = useState('');
  const { cancel } = useAffiliateWrites();
  const id = useId();
  const submit = () => {
    void cancel
      .mutateAsync({ ids, reason: reason.trim() })
      .then((result) => {
        if (result) onClose();
      })
      .catch(() => undefined);
  };
  return (
    <Modal
      open
      title={t('cancelTitle')}
      onClose={onClose}
      size="small"
      dismissible={!cancel.isPending}
      maskClosable={!cancel.isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={cancel.isPending}>
            {t('close')}
          </Button>
          <Button
            danger
            type="primary"
            loading={cancel.isPending}
            disabled={!reason.trim() || ids.length === 0}
            onClick={submit}
          >
            {t('confirm')}
          </Button>
        </>
      }
    >
      <div className={styles.stack}>
        <label htmlFor={id}>{t('cancelReason')}</label>
        <Input.TextArea
          id={id}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={cancel.isPending}
        />
        <span className={styles.hint}>{t('cancelHint')}</span>
      </div>
    </Modal>
  );
}
