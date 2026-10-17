import type { Metadata } from 'next';
import { MarketingScreen } from '@/features/marketing';

export const metadata: Metadata = { title: 'Marketing · OPC Hub Admin' };
// Tab đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function MarketingPage() {
  return <MarketingScreen />;
}
