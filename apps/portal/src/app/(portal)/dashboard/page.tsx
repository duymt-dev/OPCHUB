import type { Metadata } from 'next';
import { DashboardScreen } from '@/features/dashboard';

export const metadata: Metadata = { title: 'Dashboard · OPC Hub' };

/**
 * P-01 → P-06. Lọc LIVE + trang nằm trên URL (useSearchParams) nên render động,
 * không bọc Suspense (fallback đứng yên khi đồng hồ parity dừng).
 */
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <DashboardScreen />;
}
