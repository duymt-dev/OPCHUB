import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SsoCompleteScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Đăng nhập SSO · OPC Hub' };

export default function Page() {
  return (
    <Suspense>
      <SsoCompleteScreen />
    </Suspense>
  );
}
