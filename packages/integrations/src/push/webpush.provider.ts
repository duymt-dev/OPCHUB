import { lookup } from 'node:dns';
import { Agent } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import webpush from 'web-push';
import { z } from 'zod';
import { pushPayloadSchema, pushSubscribeSchema } from '@opchub/shared/api-domains';
import { IntegrationError } from '../errors';
import type { PushOptions, PushProvider, PushResult } from './types';

/** Resolve once in the socket lookup, rejecting private targets (including DNS rebinding). */
function publicAddress(address: string): boolean {
  const ip = address.toLowerCase();
  if (isIP(ip) === 6) return /^[23][0-9a-f]{3}:/.test(ip) && !ip.startsWith('2001:db8:');
  if (isIP(ip) !== 4) return false;
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a !== 0 &&
    a !== 10 &&
    a !== 127 &&
    a < 224 &&
    !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && (b === 168 || b === 0)) &&
    !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 198 && (b === 18 || b === 19))
  );
}
const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true, family: options.family ?? 0 }, (error, addresses) => {
    const safe = addresses?.filter((entry) => publicAddress(entry.address));
    if (error || !safe?.length) {
      callback(new Error('Push destination unavailable'), '', 4);
      return;
    }
    if (options.all) callback(null, safe);
    else {
      const first = safe[0];
      if (first) callback(null, first.address, first.family);
    }
  });
};
const statusSchema = z.object({ statusCode: z.number().int() });
export interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export class WebPushProvider implements PushProvider {
  readonly name = 'webpush';
  private readonly agent = new Agent({ keepAlive: true, lookup: safeLookup });
  constructor(private readonly vapid: VapidDetails) {
    try {
      webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    } catch {
      throw new IntegrationError('webpush', 'Cấu hình VAPID không hợp lệ', false);
    }
  }
  async send(
    subscription: z.infer<typeof pushSubscribeSchema>,
    payload: z.infer<typeof pushPayloadSchema>,
    options: PushOptions,
  ): Promise<PushResult> {
    const input = pushSubscribeSchema.parse(subscription);
    const url = new URL(input.endpoint);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || (isIP(host) && !publicAddress(host))) {
      throw new IntegrationError(this.name, 'Địa chỉ đẩy không được phép', false);
    }
    const body = JSON.stringify(pushPayloadSchema.parse(payload));
    if (Buffer.byteLength(body) + 103 > 3072) {
      throw new IntegrationError(this.name, 'Nội dung đẩy vượt giới hạn', false);
    }
    try {
      const result = statusSchema.parse(
        await webpush.sendNotification(input, body, {
          TTL: options.ttl,
          urgency: options.urgency,
          timeout: 5000,
          agent: this.agent,
          vapidDetails: this.vapid,
        }),
      );
      return this.result(result.statusCode);
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      const status = statusSchema.safeParse(error);
      return status.success ? this.result(status.data.statusCode) : { retry: true };
    }
  }
  private result(status: number): PushResult {
    if (status >= 200 && status < 300) return { ok: true };
    if (status === 404 || status === 410) return { gone: true };
    if (status === 429 || status >= 500) return { retry: true };
    throw new IntegrationError(this.name, 'Dịch vụ đẩy từ chối yêu cầu', false);
  }
}
