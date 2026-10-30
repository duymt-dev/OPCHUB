import { api } from '@/lib/api-client';
import { fetchFees } from './api';

vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));

it('REQ-616 P9 maps the shareable gdv tab URL to the native exemption status contract', async () => {
  vi.mocked(api).mockResolvedValue({ items: [], total: 0, page: 1, size: 10 });
  await fetchFees({ q: '  Director  ', status: 'gdv', page: 1, size: 10 });
  const path = vi.mocked(api).mock.calls[0]?.[0];
  expect(path).toBe('/admin/fees?page=1&size=10&q=Director&status=regional_director');
});
