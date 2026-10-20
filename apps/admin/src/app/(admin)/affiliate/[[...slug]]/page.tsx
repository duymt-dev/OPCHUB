import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AffiliateScreen, AffiliateDetailScreen } from '@/features/affiliate';

export const metadata: Metadata = { title: 'Affiliate · OPC Hub Admin' };
export const dynamic = 'force-dynamic';

export default async function AffiliatePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  return slug[0] ? <AffiliateDetailScreen id={slug[0]} /> : <AffiliateScreen />;
}
