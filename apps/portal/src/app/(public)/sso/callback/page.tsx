import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { SsoCompleteScreen } from '@/features/auth';

export const generateMetadata = pageMeta('sso');

export default function Page() {
  return (
    <Suspense>
      <SsoCompleteScreen />
    </Suspense>
  );
}
