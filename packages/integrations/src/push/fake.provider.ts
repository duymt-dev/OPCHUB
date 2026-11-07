import { z } from 'zod';
import { pushPayloadSchema, pushSubscribeSchema } from '@opchub/shared/api-domains';
import { IntegrationError } from '../errors';
import type { PushOptions, PushProvider, PushResult } from './types';

const reply = z.object({ status: z.number().int() });
/** No real push traffic. Only the literal HTTP loopback endpoint can receive a test POST. */
export class FakePushProvider implements PushProvider {
  readonly name = 'fake';
  readonly sent: { payload: z.infer<typeof pushPayloadSchema>; options: PushOptions }[] = [];

  async send(
    input: z.infer<typeof pushSubscribeSchema>,
    data: z.infer<typeof pushPayloadSchema>,
    options: PushOptions,
  ): Promise<PushResult> {
    const subscription = pushSubscribeSchema.parse(input);
    const payload = pushPayloadSchema.parse(data);
    const url = new URL(subscription.endpoint);
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1') {
      try {
        const response = await fetch(url, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(5000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload, options }),
        });
        const { status } = reply.parse({ status: response.status });
        if (status === 404 || status === 410) return { gone: true };
        if (status === 429 || status >= 500) return { retry: true };
        if (!response.ok)
          throw new IntegrationError('fake-push', 'Dịch vụ đẩy từ chối yêu cầu', false);
      } catch (error) {
        if (error instanceof IntegrationError) throw error;
        return { retry: true };
      }
    }
    this.sent.push({ payload, options: { ...options } });
    if (this.sent.length > 200) this.sent.shift();
    return { ok: true };
  }
}
