'use client';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import styles from './bank.module.css';
export function BankCopyButton({ value }: { value: string }) {
  const t = useTranslations('settings.bank'),
    toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(t('copied'));
    } catch {
      toast(t('copyFailed'));
    }
  };
  return (
    <button className={styles.button} type="button" onClick={() => void copy()}>
      {t('copy')}
    </button>
  );
}
