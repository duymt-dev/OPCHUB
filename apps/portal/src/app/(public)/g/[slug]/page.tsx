import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchPublicStore } from '@/lib/server-api';
import { portalServerEnv } from '@/lib/env';
import { PublicStorePage } from '@/features/stores';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await fetchPublicStore((await params).slug);
  if (!s)
    return {
      title: (await getTranslations('stores.guest'))('notFound'),
      robots: { index: false, follow: false },
    };
  const url = `${portalServerEnv().PORTAL_URL.replace(/\/$/, '')}/g/${s.slug}`;
  return {
    title: s.seo.title,
    description: s.seo.desc,
    robots: { index: s.seo.index, follow: s.seo.index },
    alternates: { canonical: url },
    openGraph: {
      title: s.seo.title,
      description: s.seo.desc,
      url,
      type: 'website',
      locale: 'vi_VN',
      ...((s.coverUrl ?? s.logoUrl) ? { images: [s.coverUrl ?? s.logoUrl ?? ''] } : {}),
    },
  };
}

export default async function Page({ params }: Props) {
  const s = await fetchPublicStore((await params).slug);
  if (!s) notFound();
  return <PublicStorePage store={s} />;
}
