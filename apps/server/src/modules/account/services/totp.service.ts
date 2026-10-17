import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { SecretBox } from '@/common/crypto/secret-box';
import { unauthorized } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import { newTotpSecret, otpauthUrl, verifyTotp } from '../domain/totp';
import { CredentialRepository } from '../repositories/credential.repository';

const challengeSchema = z.object({ userId: z.string(), remember: z.boolean() });
const MFA_TTL_SEC = 5 * 60;
const MAX_FAILS = 5;
const mfaKey = (t: string) => `auth:mfa:${t}`;
const failKey = (t: string) => `auth:mfa:fails:${t}`;
const usedKey = (userId: string, code: string) => `auth:mfa:used:${userId}:${code}`;

export const MFA_REQUIRED = 'Cần mã xác thực 2 lớp';
const MFA_INVALID = 'Mã xác thực 2 lớp không đúng';

/**
 * TOTP (D-27, Q-B12-1): chỉ bắt buộc khi TK đã bật (có `totp_secret_enc`). Secret mã hoá
 * AES-256-GCM (SecretBox). Bật/tắt từ màn quản trị làm ở B40 — ở đây có `enroll`/`disable`.
 */
@Injectable()
export class TotpService {
  constructor(
    private readonly creds: CredentialRepository,
    private readonly box: SecretBox,
    private readonly redis: RedisService,
  ) {}

  async enroll(userId: string, account: string): Promise<{ otpauthUrl: string }> {
    const secret = newTotpSecret();
    await this.creds.setTotpSecret(userId, new Uint8Array(this.box.seal(secret)));
    return { otpauthUrl: otpauthUrl(secret, account) };
  }

  async disable(userId: string): Promise<void> {
    await this.creds.setTotpSecret(userId, null);
  }

  /** Mật khẩu đúng + TK có TOTP → phát mfaToken (Redis 5') thay cho phiên */
  async challenge(userId: string, remember: boolean): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    await this.redis.client.set(
      mfaKey(token),
      JSON.stringify({ userId, remember }),
      'EX',
      MFA_TTL_SEC,
    );
    return token;
  }

  /** Mã đúng ±1 bước → userId; sai → 401 (5 lần sai huỷ mfaToken); mã đã dùng không dùng lại */
  async complete(token: string, code: string, now = new Date()) {
    const raw = await this.redis.client.get(mfaKey(token));
    if (!raw) throw unauthorized('Phiên xác thực 2 lớp đã hết hạn, vui lòng đăng nhập lại');
    const { userId, remember } = challengeSchema.parse(JSON.parse(raw));
    const row = await this.creds.findTotpSecret(userId);
    const ok =
      row?.totpSecretEnc != null && verifyTotp(this.box.open(row.totpSecretEnc), code, now);
    const fresh =
      ok && (await this.redis.client.set(usedKey(userId, code), '1', 'EX', 90, 'NX')) === 'OK';
    if (!fresh) {
      const n = await this.redis.client.incr(failKey(token));
      if (n === 1) await this.redis.client.expire(failKey(token), MFA_TTL_SEC);
      if (n >= MAX_FAILS) await this.redis.client.del(mfaKey(token), failKey(token));
      throw unauthorized(MFA_INVALID);
    }
    await this.redis.client.del(mfaKey(token), failKey(token));
    return { userId, remember };
  }
}
