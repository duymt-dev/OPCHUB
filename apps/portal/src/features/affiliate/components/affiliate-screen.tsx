'use client';

import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAffiliate } from '../hooks/use-affiliate';
import { useAffiliateTheme } from '../theme';
import { AffiliateLocked } from './affiliate-hero';
import { AffiliateHeader } from './affiliate-header';
import { AffiliateActiveScreen } from './affiliate-active-screen';
import styles from './affiliate.module.css';

/** Page orchestration only; forms, lists and server state belong to their own modules. */
export function AffiliateScreen() {
  const q = useAffiliate();
  const t = useTranslations('common.state');
  const tokens = useAffiliateTheme();
  if (q.isPending) return <PageSkeleton />;
  if (q.isError)
    return (
      <ErrorState title={t('error')} retryLabel={t('retry')} onRetry={() => void q.refetch()} />
    );
  return (
    <div className={styles.screen} style={tokens}>
      <AffiliateHeader />
      <div className={styles.content}>
        {q.data.state === 'locked' ? (
          <AffiliateLocked policy={q.data.policy} />
        ) : (
          <AffiliateActiveScreen data={q.data} />
        )}
      </div>
    </div>
  );
}
