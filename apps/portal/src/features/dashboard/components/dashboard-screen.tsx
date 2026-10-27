'use client';

import { useTranslations } from 'next-intl';
import { OnboardingPanel } from '@/features/onboarding';
import styles from './dashboard.module.css';

/**
 * P-01: Dashboard v4 (D-89) — lời chào + "Hướng dẫn bắt đầu", như prototype v4. Khối LIVE cũ
 * (REQ-224) không còn trên giao diện v4; API `/dashboard/live` giữ nguyên ở server.
 */
export function DashboardScreen() {
  const t = useTranslations('dashboard.page');
  return (
    <>
      <h1 className={styles.srOnly}>{t('title')}</h1>
      <OnboardingPanel />
    </>
  );
}
