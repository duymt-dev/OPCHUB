import { pageMeta } from '@/i18n/page-meta';
import { DashboardScreen } from '@/features/dashboard';

export const generateMetadata = pageMeta('services');

/**
 * P-79 → P-83: `/services`, `/services/:svc/request`, `/services/requests/:code`.
 * Hộp Gói dịch vụ do PaywallGate (khung app) mở theo URL; vào thẳng đường dẫn thì nền là
 * Dashboard như prototype (mở từ sidebar thì giữ màn đang xem).
 */
export const dynamic = 'force-dynamic';

export default function ServicesPage() {
  return <DashboardScreen />;
}
