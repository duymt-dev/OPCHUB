import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Đặt lại mật khẩu · OPC Hub Admin' };

export default function Page() {
  return (
    <Suspense>
      <ResetScreen />
    </Suspense>
  );
}
