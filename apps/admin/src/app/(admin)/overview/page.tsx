import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { OverviewScreen } from '@/features/overview';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('overview')} · OPC Hub Admin` };
}

export default function OverviewPage() {
  return <OverviewScreen />;
}
