import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { InvestorsScreen } from '@/features/investors';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('investors')} · OPC Hub Admin` };
}
// Lọc/trang đọc từ URL ở client — không bọc Suspense (đồng hồ parity dừng thì fallback kẹt)
export const dynamic = 'force-dynamic';

export default function InvestorsPage() {
  return <InvestorsScreen />;
}
