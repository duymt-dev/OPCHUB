import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SsoCompleteScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Đăng nhập SSO · OPC Hub' };

/** BUG-034, NA-17: redirect_uri của provider thật = `/sso/callback/<provider>?code=&state=` */
export default function Page() {
  return (
    <Suspense>
      <SsoCompleteScreen />
    </Suspense>
  );
}
