'use client';
import { useTranslations } from 'next-intl';
import type { AppNotifyPanel } from '../types';
import { Switch } from './switch';
import styles from './app-notify.module.css';
export function AppNotifyPwa({ p }: { p: AppNotifyPanel }) {
  const t = useTranslations('settings.app');
  const form = p.form;
  if (!form) return null;
  return (
    <div className={styles.pwa}>
      <span className={styles.phone} aria-hidden>
        <svg
          width="22"
          height="26"
          viewBox="0 0 24 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="5" y="2" width="14" height="24" rx="2" />
          <path d="M10 22h4" />
        </svg>
      </span>
      <div>
        <b>{t('pwa')}</b>
        <small>{t(form.pwa ? 'on' : 'off')}</small>
      </div>
      <Switch
        on={form.pwa}
        label={t('pwa')}
        disabled={p.busy}
        onChange={(pwa) => p.setDraft({ ...form, pwa })}
        size="lg"
      />
    </div>
  );
}
