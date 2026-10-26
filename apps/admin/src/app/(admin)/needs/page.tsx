import type { Metadata } from 'next';
import { NeedsScreen } from '@/features/needs';

export const metadata: Metadata = { title: 'Nhu cầu địa phương · OPC Hub Admin' };
// Lọc/trang đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function NeedsPage() {
  return <NeedsScreen />;
}
