import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AffiliateScreen, AffiliateDetailScreen } from '@/features/affiliate';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: `${t('affiliate')} · OPC Hub Admin` };
}
export const dynamic = 'force-dynamic';

export default async function AffiliatePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  return slug[0] ? <AffiliateDetailScreen id={slug[0]} /> : <AffiliateScreen />;
}
