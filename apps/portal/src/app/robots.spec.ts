import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/store-sitemap', () => ({
  publicOrigin: () => 'https://opchub.community',
  storeSitemapEntries: vi
    .fn()
    .mockResolvedValue(Array.from({ length: 50001 }, () => ({ url: 'x' }))),
  sitemapChunks: () => [{ id: 0 }, { id: 1 }],
}));
import { headers } from 'next/headers';
import robots from './robots';
beforeEach(() => vi.clearAllMocks());
describe('REQ-627 B15 robots host boundaries', () => {
  it('REQ-627 canonical host permits only public content and advertises all sitemap chunks', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ host: 'opchub.community' }));
    const result = await robots();
    const rule = result.rules as { allow: string[]; disallow: string[] };
    expect(rule.allow).toEqual(['/g/', '/huong-dan']);
    for (const path of ['/dashboard', '/login', '/v1/']) expect(rule.disallow).toContain(path);
    expect(result.sitemap).toEqual([
      'https://opchub.community/sitemap.xml',
      'https://opchub.community/store-sitemaps/sitemap/1.xml',
    ]);
  });
  it.each(['app.opchub.community', 'evil.test', 'opchub.community.evil.test', ''])(
    'REQ-627 duplicate/untrusted host %s is fully disallowed',
    async (host) => {
      vi.mocked(headers).mockResolvedValue(new Headers({ host }));
      expect(await robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
    },
  );
});
