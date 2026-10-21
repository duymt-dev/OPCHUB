import { Injectable } from '@nestjs/common';
import { SSO_IDS } from '@opchub/shared/api-domains';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { RedisService } from '@/common/redis/redis.service';

/** D-64: state OAuth sống 10 phút, dùng một lần */
const STATE_TTL_SEC = 10 * 60;
const stateKey = (s: string) => `sso:state:${s}`;
const storedSchema = z.object({
  button: z.enum(SSO_IDS),
  flow: z.enum(['google', 'facebook', 'linkedin']),
  nonce: z.string(),
  codeVerifier: z.string(),
});
export type SsoPendingState = z.infer<typeof storedSchema>;

const b64url = (n: number) => randomBytes(n).toString('base64url');

/** Chống CSRF + replay cho OAuth: `state`, `nonce` và PKCE verifier giữ ở server (Redis) */
@Injectable()
export class SsoStateService {
  constructor(private readonly redis: RedisService) {}

  async create(
    button: SsoPendingState['button'],
    flow: SsoPendingState['flow'],
  ): Promise<{ state: string; nonce: string; codeChallenge: string }> {
    const state = b64url(32);
    const nonce = b64url(16);
    const codeVerifier = b64url(32);
    const stored: SsoPendingState = { button, flow, nonce, codeVerifier };
    await this.redis.client.set(stateKey(state), JSON.stringify(stored), 'EX', STATE_TTL_SEC);
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    return { state, nonce, codeChallenge };
  }

  /** Lấy và xoá ngay — state đã dùng / hết hạn / hỏng → null */
  async consume(state: string): Promise<SsoPendingState | null> {
    const raw = await this.redis.client.getdel(stateKey(state));
    if (!raw) return null;
    try {
      const p = storedSchema.safeParse(JSON.parse(raw));
      return p.success ? p.data : null;
    } catch {
      return null;
    }
  }
}
