import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { UnsubscribeScreen } from '@/features/auth';

export const generateMetadata = pageMeta('unsubscribe');

export default function Page() {
  return (
    <Suspense>
      <UnsubscribeScreen />
    </Suspense>
  );
}
