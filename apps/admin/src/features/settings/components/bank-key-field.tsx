'use client';
import { useState } from 'react';
import { Modal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { BankPanel } from '../types';
import styles from './bank.module.css';
import { BankCopyButton } from './bank-copy-button';

export function BankKeyField({
  panel: p,
  hint,
  provider,
}: {
  panel: BankPanel;
  hint: string;
  provider: string;
}) {
  const t = useTranslations('settings.bank');
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <label className={styles.muted} htmlFor="bank-secret">
        {t('secret')}
      </label>
      <div className={styles.field}>
        <input id="bank-secret" readOnly value={`sk_live_••••••••••••${hint}`} />
        <button
          type="button"
          className={styles.button}
          disabled={p.busy}
          onClick={() => setConfirm(true)}
        >
          {t('rotate')}
        </button>
      </div>
      {confirm ? (
        <Modal open title={t('rotate')} onClose={() => setConfirm(false)} closeLabel={t('cancel')}>
          <p>{t('rotateWarning', { provider })}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => setConfirm(false)}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={p.busy}
              onClick={() => p.rotate.mutate(undefined, { onSuccess: () => setConfirm(false) })}
            >
              {t('confirmRotate')}
            </button>
          </div>
        </Modal>
      ) : null}
      {p.newKey ? (
        <Modal open title={t('copyNew')} onClose={p.clearKey} closeLabel={t('close')}>
          <p>{t('once')}</p>
          <label htmlFor="bank-new-key">{t('copyNew')}</label>
          <div className={styles.field}>
            <input id="bank-new-key" readOnly value={p.newKey} />
            <BankCopyButton value={p.newKey} />
          </div>
          <button type="button" className={styles.primary} onClick={p.clearKey}>
            {t('close')}
          </button>
        </Modal>
      ) : null}
    </>
  );
}
