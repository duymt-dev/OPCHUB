// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/server-api', () => ({
  fetchPublicStore: vi.fn(),
  fetchStoreOgLogo: vi.fn().mockResolvedValue(null),
}));
vi.mock('@opchub/ui', () => ({
  colors: { primaryBg: '#E6F4FF', primary: '#1677FF', text: 'rgba(0,0,0,0.88)' },
}));
import { mockStorePublicPage } from '@opchub/shared/mock-domains';
import { fetchPublicStore } from '@/lib/server-api';
import { GET } from './opengraph-image/route';
beforeEach(() => vi.clearAllMocks());
describe('REQ-627 B15 real OG rendering', () => {
  it('REQ-627 Vietnamese text renders to real PNG1200x630 with bundled font', async () => {
    const fixture = mockStorePublicPage('htx-ca-phe-hoa-phu');
    if (!fixture.ok) throw new Error('Missing fixture');
    vi.mocked(fetchPublicStore).mockResolvedValue({ ...fixture.data, coverUrl: null });
    const response = await GET(new Request('https://opchub.community/g/store/opengraph-image'), {
      params: Promise.resolve({ slug: fixture.data.slug }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
  it('REQ-627 hidden/nonexistent store returns404 without a rendered name', async () => {
    vi.mocked(fetchPublicStore).mockResolvedValue(null);
    const response = await GET(new Request('https://opchub.community/g/hidden/opengraph-image'), {
      params: Promise.resolve({ slug: 'hidden' }),
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
  });
});
