import { Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_TYPE, MEMBERSHIP_FEE_STATUS } from '@opchub/shared';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { ENV, type Env } from '../config';
import { unauthorized } from '../errors';

/** Access JWT 15 phút (auth-rbac.md › Token) */
export const ACCESS_TTL_SEC = 15 * 60;

export const accessClaimsSchema = z.object({
  sub: z.string().min(1),
  accountType: z.enum(ACCOUNT_TYPE),
  systemRole: z.enum(['super_admin', 'admin', 'moderator', 'member']),
  permVersion: z.number().int(),
  membershipFee: z
    .object({ status: z.enum(MEMBERSHIP_FEE_STATUS), validUntil: z.string().nullable() })
    .nullable(),
  mustChangePassword: z.boolean(),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

/** Ký / kiểm access token — dùng chung cho api (guard) và socket (handshake, B22) */
@Injectable()
export class AccessTokenService {
  private readonly key: Uint8Array;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  sign(claims: AccessClaims, now = new Date()): Promise<string> {
    const { sub, ...rest } = claims;
    const iat = Math.floor(now.getTime() / 1000);
    return new SignJWT(rest)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuer(this.env.JWT_ISSUER)
      .setIssuedAt(iat)
      .setExpirationTime(iat + ACCESS_TTL_SEC)
      .sign(this.key);
  }

  /** Token sai/hết hạn → 401 */
  async verify(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: this.env.JWT_ISSUER,
        algorithms: ['HS256'],
      });
      return accessClaimsSchema.parse(payload);
    } catch {
      throw unauthorized();
    }
  }
}
