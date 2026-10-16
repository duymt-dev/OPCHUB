import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ForgotScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Quên mật khẩu · OPC Hub Admin' };

export default function Page() {
  return (
    <Suspense>
      <ForgotScreen />
    </Suspense>
  );
}
