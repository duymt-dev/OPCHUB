import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { ReportsScreen } from '@/features/reports';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('reports')} · OPC Hub Admin` };
}
export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return <ReportsScreen />;
}
