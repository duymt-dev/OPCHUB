import type { PushPayload, PushSubscribe } from '@opchub/shared/api-domains';

export interface PushOptions {
  ttl: number;
  urgency: 'normal' | 'high';
}
export type PushResult = { ok: true } | { gone: true } | { retry: true };
export interface PushProvider {
  readonly name: string;
  send(
    subscription: PushSubscribe,
    payload: PushPayload,
    options: PushOptions,
  ): Promise<PushResult>;
}
