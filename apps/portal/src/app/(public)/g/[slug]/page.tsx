import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchPublicStore } from '@/lib/server-api';
import { storeSeoUrls } from '@/lib/store-seo';
import { PublicStorePage } from '@/features/stores';
import { StoreJsonLd } from './store-json-ld';
import { GuestViewBeacon } from './guest-view-beacon';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await fetchPublicStore((await params).slug);
  if (!s)
    return {
      title: (await getTranslations('stores.guest'))('notFound'),
      robots: { index: false, follow: false },
    };
  const { canonical: url, image } = storeSeoUrls(s);
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
      images: [{ url: image, width: 1200, height: 630, alt: s.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: s.seo.title,
      description: s.seo.desc,
      images: [image],
    },
  };
}

export default async function Page({ params }: Props) {
  const s = await fetchPublicStore((await params).slug);
  if (!s) notFound();
  const { canonical, image } = storeSeoUrls(s);
  return (
    <>
      <StoreJsonLd store={s} canonical={canonical} image={image} />
      <PublicStorePage store={s} />
      <GuestViewBeacon slug={s.slug} />
    </>
  );
}
