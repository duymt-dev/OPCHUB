import { describe, it, expect } from 'vitest';
import { mockStorePublicPage } from '../mock-data/domains/store-public';
import { storeJsonLd, safeJsonLd } from './store-json-ld';
import { storeSitemapQuerySchema, storeGuestViewBodySchema } from '../api-domains/store-public';

const fixture = () => {
  const result = mockStorePublicPage('htx-ca-phe-hoa-phu');
  if (!result.ok) throw new Error('Missing public fixture');
  return result.data;
};
describe('REQ-627 B15 LocalBusiness structured data', () => {
  it('REQ-627 public telephone only; no private or invented facts', () => {
    const s = { ...fixture(), phone: '0912345678', email: '', emails: [] };
    const ld = storeJsonLd(
      s,
      'https://opchub.community/g/test',
      'https://opchub.community/g/test/opengraph-image',
    );
    expect(ld).toMatchObject({
      '@type': 'LocalBusiness',
      telephone: '0912345678',
      address: { addressCountry: 'VN' },
    });
    for (const key of ['email', 'review', 'aggregateRating', 'priceRange', 'openingHours', 'team'])
      expect(ld).not.toHaveProperty(key);
  });
  it('REQ-627 safely escapes script delimiters without changing decoded business name', () => {
    const s = { ...fixture(), name: 'Company </script><script>alert(1)</script>' };
    const ld = storeJsonLd(s, 'https://opchub.community/g/test', 'https://opchub.community/og');
    if (!ld) throw new Error('Missing data');
    expect(safeJsonLd(ld)).not.toContain('<');
    expect((JSON.parse(safeJsonLd(ld)) as { name: string }).name).toBe(s.name);
  });
  it('REQ-627 noindex has no structured data; public alternate contacts preserved', () => {
    const s = fixture();
    expect(
      storeJsonLd({ ...s, seo: { ...s.seo, index: false } }, 'https://x.test', 'https://x.test/i'),
    ).toBeNull();
    const ld = storeJsonLd(
      { ...s, phone: '', phones: ['0901234567'], email: '', emails: ['public@example.test'] },
      'https://x.test',
      'https://x.test/i',
    );
    expect(ld).toMatchObject({ telephone: '0901234567', email: 'public@example.test' });
  });
  it('REQ-627 strict view body and sitemap cursor reject untrusted fields/malformed cursors', () => {
    expect(storeGuestViewBodySchema.safeParse({ ip: 'spoofed' }).success).toBe(false);
    for (const cursor of ['!bad', 'eyJ4IjoxfQ', 'e30'])
      expect(storeSitemapQuerySchema.safeParse({ cursor }).success).toBe(false);
    expect(storeSitemapQuerySchema.safeParse({ q: 'private' }).success).toBe(false);
  });
});
