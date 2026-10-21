import { pageMeta } from '@/i18n/page-meta';
import { Suspense } from 'react';
import { SsoCompleteScreen } from '@/features/auth';

export const generateMetadata = pageMeta('sso');

/** BUG-034, NA-17: redirect_uri của provider thật = `/sso/callback/<provider>?code=&state=` */
export default function Page() {
  return (
    <Suspense>
      <SsoCompleteScreen />
    </Suspense>
  );
}
