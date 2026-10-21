import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { LoginScreen } from '@/features/auth';

export const generateMetadata = pageMeta('login');

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
