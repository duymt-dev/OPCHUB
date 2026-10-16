import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Đăng nhập · OPC Hub' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
