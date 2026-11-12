import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { MarketingScreen } from '@/features/marketing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('marketing')} · OPC Hub Admin` };
}
// Tab đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function MarketingPage() {
  return <MarketingScreen />;
}
