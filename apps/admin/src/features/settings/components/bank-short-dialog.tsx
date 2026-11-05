'use client';
import { Modal } from '@opchub/ui';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './bank.module.css';

export function BankShortDialog({
  busy,
  save,
  close,
}: {
  busy: boolean;
  save: (note: string) => void;
  close: () => void;
}) {
  const t = useTranslations('settings.bank'),
    [note, setNote] = useState('');
  return (
    <Modal open title={t('short')} onClose={close} closeLabel={t('cancel')}>
      <p>{t('shortWarning')}</p>
      <label htmlFor="bank-short-note">{t('note')}</label>
      <textarea
        id="bank-short-note"
        className={styles.note}
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={busy} onClick={close}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={busy || !note.trim()}
          onClick={() => save(note.trim())}
        >
          {t('short')}
        </button>
      </div>
    </Modal>
  );
}
