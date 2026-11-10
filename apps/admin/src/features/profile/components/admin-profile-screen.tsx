'use client';

import { useTranslations } from 'next-intl';
import { ProfileDetails } from './profile-details';
import { PasswordCard } from './password-card';
import { SecurityCard } from './security-card';
import styles from './profile.module.css';

/** TIP-V46-822: orchestrator only; each form owns its mutation and state. */
export function AdminProfileScreen() {
  const t = useTranslations('common.adminProfile');
  return (
    <section className={styles.screen}>
      <h1>{t('title')}</h1>
      <p className={styles.hint}>{t('subtitle')}</p>
      <div className={styles.columns}>
        <ProfileDetails />
        <div className={styles.stack}>
          <PasswordCard />
          <SecurityCard />
        </div>
      </div>
    </section>
  );
}
