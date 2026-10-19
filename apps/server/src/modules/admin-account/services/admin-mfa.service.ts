import { Injectable } from '@nestjs/common';
import { ADMIN_AUTH_MESSAGES as MSG } from '@opchub/shared/api';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { SecretBox } from '@/common/crypto/secret-box';
import { AppError, unauthorized } from '@/common/errors';
import { RedisService } from '@/common/redis/redis.service';
import { base32, newTotpSecret, otpauthUrl, verifyTotp } from '@/modules/account';
import { AdminUserRepository } from '../repositories/admin-user.repository';

const challengeSchema = z.object({ adminId: z.string(), remember: z.boolean() });
const MFA_TTL_SEC = 5 * 60;
const SETUP_TTL_SEC = 10 * 60;
const MAX_FAILS = 5;
const mfaKey = (t: string) => `auth:admin:mfa:${t}`;
const failKey = (t: string) => `auth:admin:mfa:fails:${t}`;
const usedKey = (id: string, code: string) => `auth:admin:mfa:used:${id}:${code}`;
const setupKey = (id: string) => `auth:admin:2fa_setup:${id}`;
const setupFailKey = (id: string) => `auth:admin:2fa_setup:fails:${id}`;

const codeInvalid = () =>
  new AppError('VALIDATION_ERROR', MSG.codeInvalid, [{ path: 'code', message: MSG.codeInvalid }]);

/**
 * 2FA TK quản trị (SEC-R02, D-27, BUG-015): secret mã hoá SecretBox; thiết lập giữ secret chờ
 * trong Redis 10' tới khi nhập đúng mã. Đăng nhập: `mfaToken` 5', 5 lần sai huỷ, mã không dùng lại.
 */
@Injectable()
export class AdminMfaService {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly box: SecretBox,
    private readonly redis: RedisService,
  ) {}

  async challenge(adminId: string, remember: boolean): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    const value = JSON.stringify({ adminId, remember });
    await this.redis.client.set(mfaKey(token), value, 'EX', MFA_TTL_SEC);
    return token;
  }

  async complete(token: string, code: string, now = new Date()) {
    const raw = await this.redis.client.get(mfaKey(token));
    if (!raw) throw unauthorized('Phiên xác thực 2 lớp đã hết hạn, vui lòng đăng nhập lại');
    const { adminId, remember } = challengeSchema.parse(JSON.parse(raw));
    const sealed = await this.users.findTotpSecret(adminId);
    const ok = sealed !== null && verifyTotp(this.box.open(sealed), code, now);
    if (!ok || !(await this.fresh(adminId, code))) {
      const n = await this.redis.client.incr(failKey(token));
      if (n === 1) await this.redis.client.expire(failKey(token), MFA_TTL_SEC);
      if (n >= MAX_FAILS) await this.redis.client.del(mfaKey(token), failKey(token));
      throw unauthorized(MSG.codeInvalid);
    }
    await this.redis.client.del(mfaKey(token), failKey(token));
    return { adminId, remember };
  }

  /** Secret mới (mã hoá) chờ xác nhận; trả URL cho ứng dụng xác thực + secret che bớt */
  async setup(adminId: string, email: string) {
    const secret = newTotpSecret();
    const sealed = this.box.seal(secret).toString('base64');
    await this.redis.client.set(setupKey(adminId), sealed, 'EX', SETUP_TTL_SEC);
    await this.redis.client.del(setupFailKey(adminId));
    const b32 = base32(secret);
    return {
      otpauthUrl: otpauthUrl(secret, email),
      secretMasked: `${b32.slice(0, 4)}••••${b32.slice(-4)}`,
    };
  }

  /** Mã đúng → secret đã mã hoá để lưu; 5 lần sai huỷ thiết lập */
  async confirmSetup(adminId: string, code: string, now = new Date()): Promise<Uint8Array> {
    const raw = await this.redis.client.get(setupKey(adminId));
    if (!raw) throw new AppError('CONFLICT', MSG.twoFactorSetupExpired);
    const sealed = Buffer.from(raw, 'base64');
    if (!verifyTotp(this.box.open(sealed), code, now) || !(await this.fresh(adminId, code))) {
      const n = await this.redis.client.incr(setupFailKey(adminId));
      if (n === 1) await this.redis.client.expire(setupFailKey(adminId), SETUP_TTL_SEC);
      if (n >= MAX_FAILS) await this.redis.client.del(setupKey(adminId), setupFailKey(adminId));
      throw codeInvalid();
    }
    await this.redis.client.del(setupKey(adminId), setupFailKey(adminId));
    return new Uint8Array(sealed);
  }

  /** Mã đã dùng trong 90 giây không dùng lại */
  private async fresh(adminId: string, code: string): Promise<boolean> {
    return (await this.redis.client.set(usedKey(adminId, code), '1', 'EX', 90, 'NX')) === 'OK';
  }
}
