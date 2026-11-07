import { createECDH } from 'node:crypto';
import webpush from 'web-push';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebPushProvider } from './webpush.provider';

const ec = createECDH('prime256v1');
ec.generateKeys();
const vapid = {
  subject: 'mailto:test@opchub.invalid',
  publicKey: ec.getPublicKey().toString('base64url'),
  privateKey: ec.getPrivateKey().toString('base64url'),
};
const subscription = { endpoint: 'https://push.invalid/a', keys: { p256dh: 'test', auth: 'test' } };
const payload = { title: 'Title', body: 'Body', link: '/dashboard', tag: 'n' };
const options = { ttl: 86400, urgency: 'normal' as const };
afterEach(() => vi.restoreAllMocks());
describe('WebPushProvider protocol adapter (SDK mocked, never real push)', () => {
  it('encrypts through the SDK with VAPID, TTL, urgency and bounded socket timeout', async () => {
    const sdk = vi
      .spyOn(webpush, 'sendNotification')
      .mockResolvedValue({ statusCode: 201, headers: {}, body: '' });
    expect(await new WebPushProvider(vapid).send(subscription, payload, options)).toEqual({
      ok: true,
    });
    expect(sdk).toHaveBeenCalledWith(
      subscription,
      JSON.stringify(payload),
      expect.objectContaining({
        TTL: 86400,
        urgency: 'normal',
        timeout: 5000,
        vapidDetails: vapid,
      }),
    );
  });
  it.each([
    [404, { gone: true }],
    [410, { gone: true }],
    [429, { retry: true }],
    [503, { retry: true }],
  ])('maps response %s without leaking SDK errors', async (statusCode, expected) => {
    vi.spyOn(webpush, 'sendNotification').mockRejectedValue({
      statusCode,
      body: 'private endpoint',
    });
    expect(await new WebPushProvider(vapid).send(subscription, payload, options)).toEqual(expected);
  });
  it.each([400, 413])('makes %s terminal and strips the SDK cause', async (statusCode) => {
    vi.spyOn(webpush, 'sendNotification').mockRejectedValue({
      statusCode,
      body: 'secret endpoint',
    });
    const failure: unknown = await new WebPushProvider(vapid)
      .send(subscription, payload, options)
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ retryable: false });
    expect(failure).not.toHaveProperty('cause');
  });
  it('retries network failures without attaching raw errors', async () => {
    vi.spyOn(webpush, 'sendNotification').mockRejectedValue(new Error('private network target'));
    expect(await new WebPushProvider(vapid).send(subscription, payload, options)).toEqual({
      retry: true,
    });
  });
  it.each(['http://127.0.0.1/x', 'https://127.0.0.1/x', 'https://10.1.2.3/x', 'https://[::1]/x'])(
    'rejects private/literal target %s before SDK traffic',
    async (endpoint) => {
      const sdk = vi.spyOn(webpush, 'sendNotification');
      await expect(
        new WebPushProvider(vapid).send({ ...subscription, endpoint }, payload, options),
      ).rejects.toMatchObject({ retryable: false });
      expect(sdk).not.toHaveBeenCalled();
    },
  );
});
