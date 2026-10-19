import { Injectable } from '@nestjs/common';
import { PROFILE_MESSAGES, type Profile } from '@opchub/shared/api-domains';
import type { OtpSent } from '@opchub/shared/api';
import { AppError, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { emailChangedMail, emailChangeMail, maskEmail, MailService } from '@/modules/mail';
import { ProfileRepository } from '../repositories/profile.repository';
import { AuthService, type SessionResult } from './auth.service';
import { OTP_MAX_FAILS, OTP_TTL_SEC, OtpService } from './otp.service';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';
import { type ClientInfo, REFRESH_DAYS } from './token.service';

/** Mục đích OTP riêng theo user (nằm trong HMAC) — mã đăng ký / TK khác không dùng được */
const purposeOf = (userId: string) => `email-change:${userId}`;
/** Số lần nhập sai theo user — đủ OTP_MAX_FAILS → 429 tới khi gửi mã mới (V2Q-109) */
const failsKey = (userId: string) => `otp:email-change:fails:${userId}`;
const TOO_MANY = 'Bạn đã nhập sai mã quá nhiều lần. Vui lòng gửi lại mã mới';

const fieldError = (code: 'CONFLICT' | 'VALIDATION_ERROR', message: string) =>
  new AppError(code, message, [{ path: 'newEmail', message }]);

const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';

/**
 * BUG-030, QT-01: email là tên đăng nhập → chỉ đổi sau khi xác nhận OTP gửi tới email MỚI.
 * Xác nhận xong: đổi email (cập nhật có điều kiện), email liên kết SSO, thu hồi mọi phiên khác,
 * báo email cũ. Không log mã OTP / email đầy đủ.
 */
@Injectable()
export class EmailChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProfileRepository,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly sessions: SessionService,
    private readonly profiles: ProfileService,
    private readonly auth: AuthService,
    private readonly redis: RedisService,
  ) {}

  async request(userId: string, newEmail: string): Promise<OtpSent> {
    await this.assertUsable(userId, newEmail);
    const code = await this.otp.issue(purposeOf(userId), newEmail);
    await this.redis.client.del(failsKey(userId));
    const m = emailChangeMail(code, OTP_TTL_SEC / 60);
    await this.prisma.db.$transaction((tx) =>
      this.mail.request(tx, { to: newEmail, kind: 'otp', subject: m.subject, html: m.html }),
    );
    return { email: newEmail, expiresInSec: OTP_TTL_SEC };
  }

  /**
   * Cookie refresh có path `/v1/auth` nên không tới `/v1/me/*` → thu hồi MỌI chuỗi refresh
   * (`revokeOthers` không giữ chuỗi nào) rồi mở chuỗi mới cho thiết bị đang thao tác (V2Q-108).
   */
  async verify(
    userId: string,
    newEmail: string,
    code: string,
    client: ClientInfo,
    now = new Date(),
  ): Promise<{ profile: Profile; session: SessionResult }> {
    const old = await this.assertUsable(userId, newEmail);
    await this.checkCode(userId, newEmail, code);
    const done = emailChangedMail(maskEmail(newEmail));
    await this.prisma.db
      .$transaction(async (tx) => {
        const n = await this.repo.updateEmail(tx, userId, old, newEmail, now);
        if (n === 0) throw fieldError('CONFLICT', PROFILE_MESSAGES.emailTaken);
        // V2Q-107: kind `otp` (thư tài khoản, ưu tiên cao) — không thêm kind mới (không đổi schema)
        await this.mail.request(tx, {
          to: old,
          kind: 'otp',
          subject: done.subject,
          html: done.html,
        });
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) throw fieldError('CONFLICT', PROFILE_MESSAGES.emailTaken);
        throw err;
      });
    await Promise.all([
      this.otp.clearSends(newEmail),
      this.sessions.revokeOthers(userId, undefined, now),
    ]);
    const [row, profile] = await Promise.all([this.repo.find(userId), this.profiles.get(userId)]);
    if (!row) throw unauthorized();
    const session = await this.auth.startSession(
      row,
      client,
      { days: REFRESH_DAYS.session },
      false,
      now,
    );
    return { profile, session };
  }

  /** Sai → 422 OTP_INVALID; sai lần thứ OTP_MAX_FAILS trở đi → 429 (OtpService đã huỷ mã) */
  private async checkCode(userId: string, newEmail: string, code: string): Promise<void> {
    const key = failsKey(userId);
    const tooMany = () => new AppError('RATE_LIMITED', TOO_MANY, undefined, OTP_TTL_SEC);
    if (Number(await this.redis.client.get(key)) >= OTP_MAX_FAILS) throw tooMany();
    try {
      await this.otp.verify(purposeOf(userId), newEmail, code);
    } catch (err) {
      if (!(err instanceof AppError) || err.code !== 'OTP_INVALID') throw err;
      const fails = await this.redis.client.incr(key);
      if (fails === 1) await this.redis.client.expire(key, OTP_TTL_SEC);
      throw fails >= OTP_MAX_FAILS ? tooMany() : err;
    }
    await this.redis.client.del(key);
  }

  /** Trả email hiện tại; email mới trùng email cũ → 400, thuộc TK khác → 409 (field `newEmail`) */
  private async assertUsable(userId: string, newEmail: string): Promise<string> {
    const row = await this.repo.find(userId);
    if (!row) throw unauthorized();
    const current = row.email.toLowerCase();
    if (current === newEmail) throw fieldError('VALIDATION_ERROR', PROFILE_MESSAGES.emailSame);
    const taken = await this.repo.takenByOther(userId, newEmail);
    if (taken.email) throw fieldError('CONFLICT', PROFILE_MESSAGES.emailTaken);
    return row.email;
  }
}
