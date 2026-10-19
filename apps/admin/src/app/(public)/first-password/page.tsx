import type { Metadata } from 'next';
import { SetupGate, FirstPasswordScreen } from '@/features/auth';

export const metadata: Metadata = { title: 'Đổi mật khẩu lần đầu · OPC Hub Admin' };

export default function Page() {
  return (
    <SetupGate>
      <FirstPasswordScreen />
    </SetupGate>
  );
}
