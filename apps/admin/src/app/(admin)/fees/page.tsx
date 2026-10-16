import type { Metadata } from 'next';
import { FeesScreen } from '@/features/fees';

export const metadata: Metadata = { title: 'Phí thành viên · OPC Hub Admin' };
// Lọc/trang đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function FeesPage() {
  return <FeesScreen />;
}
