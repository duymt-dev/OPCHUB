import type { Metadata } from 'next';
import { RequestsScreen } from '@/features/requests';

export const metadata: Metadata = { title: 'Dịch vụ · OPC Hub Admin' };
export const dynamic = 'force-dynamic';

/** /requests (Yêu cầu đăng ký) · /requests/catalog (Danh mục dịch vụ) — D-61 → D-65 */
export default function RequestsPage() {
  return <RequestsScreen />;
}
