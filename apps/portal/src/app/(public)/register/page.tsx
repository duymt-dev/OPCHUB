import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { RegisterScreen } from '@/features/auth';

export const generateMetadata = pageMeta('register');

export default function Page() {
  return (
    <Suspense>
      <RegisterScreen />
    </Suspense>
  );
}
