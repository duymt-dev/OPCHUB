'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { useNowMinute } from '../hooks/use-now-minute';
import { dayPartOf, firstNameOf, vnClock } from '../model';
import styles from './onboarding.module.css';

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Dòng ngày "Thứ X, dd/mm/yyyy" + "Chào buổi …, {tên}" + lời dẫn (prototype `clockDate`, `dh.greet`) */
export function Greeting() {
  const t = useTranslations('onboarding.greet');
  const name = useAuthStore((s) => s.me?.fullName ?? '');
  const now = useNowMinute();
  const c = vnClock(now);
  return (
    <div className={styles.greet} data-onb="greet">
      <span className={styles.date}>
        {t('date', { dow: t(`dow.${DOW[c.dow] ?? 'sun'}`), date: c.date })}
      </span>
      <h2 className={styles.hello}>{t(dayPartOf(c.hour), { name: firstNameOf(name) })}</h2>
      <p className={styles.lead}>{t('lead')}</p>
    </div>
  );
}
