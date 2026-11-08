import { Injectable } from '@nestjs/common';
import type { MailQrPayload } from '@opchub/shared/api-domains';

export interface MailQrResolver {
  resolve(target: MailQrPayload): Promise<string | null>;
}
/** Domains own invoice reads. Mail never imports fee/project modules back. */
@Injectable()
export class MailQrRegistry {
  private readonly resolvers = new Map<MailQrPayload['kind'], MailQrResolver>();
  register(kind: MailQrPayload['kind'], resolver: MailQrResolver) {
    if (this.resolvers.has(kind)) throw new Error('Duplicate mail QR resolver');
    this.resolvers.set(kind, resolver);
  }
  async resolve(target: MailQrPayload) {
    return (await this.resolvers.get(target.kind)?.resolve(target)) ?? null;
  }
}
