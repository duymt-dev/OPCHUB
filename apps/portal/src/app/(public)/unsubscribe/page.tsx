import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UnsubscribeScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Huỷ đăng ký nhận email · OPC Hub' };

export default function Page() {
  return (
    <Suspense>
      <UnsubscribeScreen />
    </Suspense>
  );
}
