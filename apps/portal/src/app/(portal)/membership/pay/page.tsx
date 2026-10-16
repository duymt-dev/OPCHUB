import type { Metadata } from 'next';
import { DashboardScreen } from '@/features/dashboard';

export const metadata: Metadata = { title: 'Thanh toán phí thành viên · OPC Hub' };

/** P-84 → P-86: hộp chuyển khoản do PaywallGate mở theo URL; nền là Dashboard */
export const dynamic = 'force-dynamic';

export default function MembershipPayPage() {
  return <DashboardScreen />;
}
