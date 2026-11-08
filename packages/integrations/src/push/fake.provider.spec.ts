import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakePushProvider } from './fake.provider';

const payload = { title: 'T', body: '', link: '/dashboard', tag: 'n' };
const options = { ttl: 86400, urgency: 'normal' as const };
const sub = { endpoint: 'https://push.invalid/device', keys: { p256dh: 'a', auth: 'b' } };
afterEach(() => vi.unstubAllGlobals());
describe('FakePushProvider', () => {
  it('stores safe payloads without contacting real HTTPS endpoints or retaining keys', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const provider = new FakePushProvider();
    expect(await provider.send(sub, payload, options)).toEqual({ ok: true });
    expect(fetcher).not.toHaveBeenCalled();
    expect(provider.sent).toEqual([{ payload, options }]);
  });
  it.each([
    [201, { ok: true }],
    [404, { gone: true }],
    [410, { gone: true }],
    [429, { retry: true }],
    [503, { retry: true }],
  ])('maps loopback status %s', async (status, result) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));
    vi.stubGlobal('fetch', fetcher);
    expect(
      await new FakePushProvider().send(
        { ...sub, endpoint: 'http://127.0.0.1:4890/x' },
        payload,
        options,
      ),
    ).toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: 'error' }),
    );
  });
  it('returns retry without exposing network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private endpoint')));
    expect(
      await new FakePushProvider().send(
        { ...sub, endpoint: 'http://127.0.0.1:4890/x' },
        payload,
        options,
      ),
    ).toEqual({ retry: true });
  });
});
