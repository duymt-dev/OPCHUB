import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { ForgotScreen } from '@/features/auth';

export const generateMetadata = pageMeta('forgotPassword');

export default function Page() {
  return (
    <Suspense>
      <ForgotScreen />
    </Suspense>
  );
}
