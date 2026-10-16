import type { Metadata } from 'next';
import { DashboardScreen } from '@/features/dashboard';

export const metadata: Metadata = { title: 'Gói dịch vụ · OPC Hub' };

/**
 * P-79 → P-83: `/services`, `/services/:svc/request`, `/services/requests/:code`.
 * Hộp Gói dịch vụ do PaywallGate (khung app) mở theo URL; vào thẳng đường dẫn thì nền là
 * Dashboard như prototype (mở từ sidebar thì giữ màn đang xem).
 */
export const dynamic = 'force-dynamic';

export default function ServicesPage() {
  return <DashboardScreen />;
}
