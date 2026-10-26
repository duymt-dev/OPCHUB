import type { Metadata } from 'next';
import { StoresScreen } from '@/features/stores';

export const metadata: Metadata = { title: 'Gian hàng · OPC Hub Admin' };
// Lọc/trang đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function StoresPage() {
  return <StoresScreen />;
}
