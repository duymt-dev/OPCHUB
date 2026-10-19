import type { Metadata } from 'next';
import { SetupGate, TwoFactorScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Thiết lập xác thực 2 lớp · OPC Hub Admin' };

export default function Page() {
  return (
    <SetupGate>
      <TwoFactorScreen />
    </SetupGate>
  );
}
