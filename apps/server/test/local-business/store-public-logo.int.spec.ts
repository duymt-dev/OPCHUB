import { describe, it, expect, vi, afterEach } from 'vitest';
import { FakeStorageProvider } from '@opchub/integrations';
import { STORAGE } from '@/common/integrations';
import { publicSeoFixture } from './public-seo-fixture';

describe('REQ-627 B15 OG logo storage allowlist', () => {
  const storage = new FakeStorageProvider(),
    f = publicSeoFixture({ overrides: [[STORAGE, storage]] });
  afterEach(() => vi.restoreAllMocks());
  const get = () => f.t.call(`/public/stores/${f.slug}/logo`);
  it('REQ-627 returns only internal stored image bytes; errors degrade to no logo', async () => {
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      'base64',
    );
    await storage.put('stores/logo.png', bytes, 'image/png');
    await f.t.prisma.db.store.update({
      where: { id: f.storeId },
      data: { logoUrl: storage.publicUrl('stores/logo.png') },
    });
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    vi.spyOn(storage, 'head').mockRejectedValueOnce(new Error('storage offline'));
    expect((await get()).status).toBe(204);
  });
  it('REQ-627 arbitrary URLs/private paths/oversized objects are never fetched or disclosed', async () => {
    const head = vi.spyOn(storage, 'head');
    await f.t.prisma.db.store.update({
      where: { id: f.storeId },
      data: { logoUrl: 'http://169.254.169.254/latest/meta-data' },
    });
    expect((await get()).status).toBe(204);
    expect(head).not.toHaveBeenCalled();
    await f.t.prisma.db.store.update({
      where: { id: f.storeId },
      data: { logoUrl: storage.publicUrl('chat-image/private.png') },
    });
    expect((await get()).status).toBe(204);
    expect(head).not.toHaveBeenCalled();
    await f.t.prisma.db.store.update({
      where: { id: f.storeId },
      data: { logoUrl: storage.publicUrl('stores/big.png') },
    });
    head.mockResolvedValueOnce({ size: 2_000_001, contentType: 'image/png' });
    expect((await get()).status).toBe(204);
  });
  it('REQ-627 hidden store never exposes even internal logo', async () => {
    await f.t.prisma.db.store.update({
      where: { id: f.storeId },
      data: { status: 'hidden', hiddenPrev: 'published' },
    });
    expect((await get()).status).toBe(404);
  });
});
