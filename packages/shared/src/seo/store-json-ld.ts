import type { StorePublicPage } from '../api-domains/store-public';

const publicWebLink = (value: string) => {
  if (!value.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

/** Anonymous DTO only. No reviews, prices, private team fields or invented business facts. */
export function storeJsonLd(s: StorePublicPage, canonical: string, image: string) {
  if (!s.seo.index) return null;
  const telephone = s.phone || s.phones.find(Boolean);
  const email = s.email || s.emails.find(Boolean);
  const sameAs = [...Object.values(s.socials), s.website].flatMap((v) => publicWebLink(v) ?? []);
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: s.name,
    description: s.seo.desc,
    url: canonical,
    image,
    address: { '@type': 'PostalAddress', addressRegion: s.province, addressCountry: 'VN' },
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(sameAs.length ? { sameAs: [...new Set(sameAs)] } : {}),
  };
}

export const safeJsonLd = (data: NonNullable<ReturnType<typeof storeJsonLd>>) =>
  JSON.stringify(data).replace(/</g, '\\u003c');
