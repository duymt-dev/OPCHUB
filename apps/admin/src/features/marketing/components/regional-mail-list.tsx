'use client';
import { useTranslations } from 'next-intl';
import styles from './regional-mail.module.css';
import { useNumberText } from '@/i18n/use-number-text';

export function RegionalMailList() {
  const numberText = useNumberText();
  const t = useTranslations('marketing.regional');
  return (
    <section className={styles.panel} aria-label={t('title')}>
      <header>
        <b>{t('title')}</b>
        <span>{t('description')}</span>
      </header>
      <div className={styles.rows}>
        {(['appoint', 'revoke'] as const).map((key, i) => (
          <div key={key} className={styles.row}>
            <code>EM-GDV{numberText(i + 1)}</code>
            <b>{t(`${key}Name`)}</b>
            <span>{t(`${key}When`)}</span>
            <span className={styles.subject}>{t(`${key}Subject`, { vùng: '{vùng}' })}</span>
            <span className={styles.on}>{t('on')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
