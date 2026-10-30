'use client';

import { useTranslations } from 'next-intl';
import styles from './director-mail-templates.module.css';

/** BR-464: system mail is a readonly catalogue, never an editable campaign template. */
export function DirectorMailTemplates() {
  const t = useTranslations('marketing.directorMail');
  return (
    <section className={styles.card} aria-labelledby="director-mail-title">
      <header className={styles.header}>
        <b id="director-mail-title">{t('title')}</b>
        <span>{t('hint')}</span>
      </header>
      <div className={styles.table} role="table" aria-label={t('title')}>
        {(['appointed', 'revoked'] as const).map((kind, i) => (
          <div className={styles.row} role="row" key={kind}>
            <span className={styles.code} role="cell">{`EM-GDV${i + 1}`}</span>
            <b role="cell">{t(`${kind}.name`)}</b>
            <span className={styles.trigger} role="cell">
              {t(`${kind}.trigger`)}
            </span>
            <span role="cell">{t(`${kind}.subject`, { region: '{vùng}' })}</span>
            <span role="cell" className={styles.enabled}>
              {t('enabled')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
