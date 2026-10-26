'use client';

import { useTranslations } from 'next-intl';
import { useOnboarding } from '../hooks/use-onboarding';
import { Greeting } from './greeting';
import { OnboardingCard } from './onboarding-card';
import styles from './onboarding.module.css';

/**
 * Đầu Dashboard (Q-V4-611-1): lời chào cho mọi TK + thẻ "Hướng dẫn bắt đầu" (NĐT không có thẻ —
 * API 204). Khối LIVE của Dashboard vẫn ở phía dưới.
 */
export function OnboardingPanel() {
  const t = useTranslations('onboarding.card');
  const q = useOnboarding();
  return (
    <div className={styles.panel} data-screen="onboarding">
      <Greeting />
      {q.isError ? (
        <div className={`${styles.card} ${styles.error}`} role="alert">
          {t('error')}
          <button type="button" className={styles.cta} onClick={() => void q.refetch()}>
            {t('retry')}
          </button>
        </div>
      ) : q.data ? (
        <OnboardingCard o={q.data} />
      ) : null}
    </div>
  );
}
