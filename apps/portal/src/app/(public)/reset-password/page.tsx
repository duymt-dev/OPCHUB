import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { ResetScreen } from '@/features/auth';

export const generateMetadata = pageMeta('resetPassword');

export default function Page() {
  return (
    <Suspense>
      <ResetScreen />
    </Suspense>
  );
}
