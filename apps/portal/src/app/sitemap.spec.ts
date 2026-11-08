import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-api', () => ({ fetchStoreSitemap: vi.fn() }));
vi.mock('@/lib/server-logger', () => ({ serverLogger: { warn: vi.fn() } }));
import { fetchStoreSitemap } from '@/lib/server-api';
import { serverLogger } from '@/lib/server-logger';
import sitemap from './sitemap';
import chunked, { generateSitemaps } from './store-sitemaps/sitemap';
import { sitemapChunks, storeSitemapEntries } from '@/lib/store-sitemap';

beforeEach(() => vi.resetAllMocks());
describe('REQ-627 B15 sitemap generation', () => {
  it('REQ-627 follows API keysets, absolute canonical URLs and modification timestamps', async () => {
    vi.mocked(fetchStoreSitemap)
      .mockResolvedValueOnce({
        items: [{ slug: 'one', updatedAt: '2026-11-01T00:00:00.000Z' }],
        nextCursor: 'page-2',
      })
      .mockResolvedValueOnce({
        items: [{ slug: 'two', updatedAt: '2026-11-02T00:00:00.000Z' }],
        nextCursor: null,
      });
    expect(await sitemap()).toEqual([
      { url: 'https://opchub.community/huong-dan' },
      { url: 'https://opchub.community/g/one', lastModified: '2026-11-01T00:00:00.000Z' },
      { url: 'https://opchub.community/g/two', lastModified: '2026-11-02T00:00:00.000Z' },
    ]);
    expect(fetchStoreSitemap).toHaveBeenNthCalledWith(2, 'page-2');
  });
  it('REQ-627 partial failure returns only guide and logs safe warning', async () => {
    vi.mocked(fetchStoreSitemap)
      .mockResolvedValueOnce({
        items: [{ slug: 'one', updatedAt: '2026-11-01T00:00:00.000Z' }],
        nextCursor: 'x',
      })
      .mockRejectedValueOnce(new Error('internal url must not be logged'));
    expect(await storeSitemapEntries()).toEqual([{ url: 'https://opchub.community/huong-dan' }]);
    expect(serverLogger.warn).toHaveBeenCalledWith('store_sitemap_unavailable');
  });
  it('REQ-627 splits beyond50000 without dropping URLs and exposes generator IDs', async () => {
    const items = Array.from({ length: 50000 }, (_, i) => ({
      slug: `store-${i}`,
      updatedAt: '2026-11-01T00:00:00.000Z',
    }));
    vi.mocked(fetchStoreSitemap).mockResolvedValue({ items, nextCursor: null });
    expect(await sitemap()).toHaveLength(50000);
    expect(await generateSitemaps()).toEqual([{ id: 0 }, { id: 1 }]);
    expect(await chunked({ id: Promise.resolve('1') })).toEqual([
      { url: 'https://opchub.community/g/store-49999', lastModified: '2026-11-01T00:00:00.000Z' },
    ]);
    expect(sitemapChunks(100001)).toHaveLength(3);
  });
  it('REQ-627 repeated cursor fails closed instead of looping', async () => {
    vi.mocked(fetchStoreSitemap).mockResolvedValue({ items: [], nextCursor: 'repeat' });
    expect(await sitemap()).toEqual([{ url: 'https://opchub.community/huong-dan' }]);
    expect(fetchStoreSitemap).toHaveBeenCalledTimes(2);
  });
});
