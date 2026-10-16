import type { Metadata } from 'next';
import { InvestorsScreen } from '@/features/investors';

export const metadata: Metadata = { title: 'Nhà đầu tư · OPC Hub Admin' };
// Lọc/trang đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function InvestorsPage() {
  return <InvestorsScreen />;
}
