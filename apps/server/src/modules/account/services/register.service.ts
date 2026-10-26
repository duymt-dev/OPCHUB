import { Inject, Injectable } from '@nestjs/common';
import type { SsoId } from '@opchub/shared/api-domains';
import type { TaxInfo } from '@opchub/integrations';
import type { OtpSent, RegisterBusinessRequest, RegisterPersonalRequest } from '@opchub/shared/api';
import { AppError, conflict, forbidden } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MailService, otpMail, WelcomeService } from '@/modules/mail';
import { AppSettingsService } from '@/modules/settings';
import {
  businessVerification,
  fromBusiness,
  fromPersonal,
  isValidE164,
  type PendingRegistration,
  pendingRegistrationSchema,
} from '../domain/register.mapper';
import { FEE_WRITER, type FeeWriter, GROUP_JOIN_PORT, type GroupJoinPort } from '../ports';
import { REFERRAL_PORT, type ReferralPort } from '../ports';
import { RegistrationRepository } from '../repositories/registration.repository';
import { AuthService, type SessionResult } from './auth.service';
import { BizLookupService } from './biz-lookup.service';
import { OTP_TTL_SEC, OtpService } from './otp.service';
import { PasswordPolicyService } from './password-policy.service';
import { REFRESH_DAYS, type ClientInfo } from './token.service';

const PENDING_TTL_SEC = 30 * 60;
const pendingKey = (email: string) => `reg:${email}`;
const OTP_PURPOSE = 'register';

export const REGISTER_MESSAGES = {
  closed: 'Đăng ký mới đang tạm đóng',
  emailTaken: 'Email đã được sử dụng cho tài khoản khác',
  phoneTaken: 'Số điện thoại đã được sử dụng cho tài khoản khác',
  phoneInvalid: 'Số điện thoại không hợp lệ',
  expired: 'Phiên đăng ký đã hết hạn, vui lòng đăng ký lại',
} as const;

/**
 * QT-01 đăng ký: lưu bản chờ trong Redis (không tạo user trước OTP), gửi OTP qua outbox.
 * Xác thực OTP → một transaction tạo user + phí + yêu cầu vào nhóm + consent + mail chào mừng.
 */
@Injectable()
export class RegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly repo: RegistrationRepository,
    private readonly policy: PasswordPolicyService,
    private readonly otp: OtpService,
    private readonly auth: AuthService,
    private readonly settings: AppSettingsService,
    private readonly mail: MailService,
    private readonly welcome: WelcomeService,
    private readonly biz: BizLookupService,
    @Inject(FEE_WRITER) private readonly fees: FeeWriter,
    @Inject(GROUP_JOIN_PORT) private readonly groups: GroupJoinPort,
    @Inject(REFERRAL_PORT) private readonly referrals: ReferralPort,
  ) {}

  async registerPersonal(r: RegisterPersonalRequest): Promise<OtpSent> {
    const hash = await this.checkPassword(r.password);
    return this.start(fromPersonal(r, hash));
  }

  async registerBusiness(r: RegisterBusinessRequest): Promise<OtpSent> {
    const hash = await this.checkPassword(r.password);
    return this.start(fromBusiness(r, hash));
  }

  async resend(email: string): Promise<OtpSent> {
    const e = email.trim().toLowerCase();
    // Không lộ email có bản chờ hay không: vẫn trả 202 nhưng chỉ gửi khi có
    if (await this.loadPending(e)) await this.sendOtp(e);
    return { email: e, expiresInSec: OTP_TTL_SEC };
  }

  async verify(email: string, code: string, client: ClientInfo): Promise<SessionResult> {
    const e = email.trim().toLowerCase();
    await this.otp.verify(OTP_PURPOSE, e, code);
    const reg = await this.loadPending(e);
    if (!reg) throw new AppError('OTP_INVALID', REGISTER_MESSAGES.expired);
    const result = await this.activate(reg, client);
    await Promise.all([this.redis.client.del(pendingKey(e)), this.otp.clearSends(e)]);
    return result;
  }

  /** Dùng chung với SSO (D-45: không OTP, email đã xác thực ở provider) */
  async activate(
    reg: PendingRegistration,
    client: ClientInfo,
    sso?: { provider: SsoId; subject: string },
    now = new Date(),
  ): Promise<SessionResult> {
    if (reg.referralCode) await this.referrals.validate(reg.referralCode, reg.email);
    await this.assertAvailable(reg.email, reg.phone);
    const groupIds = await this.groups.existingGroupIds(reg.groupIds);
    const found = reg.business ? await this.lookupTax(reg.business.taxCode) : null;
    const user = await this.prisma.db
      .$transaction(async (tx) => {
        const u = await this.repo.create(tx, {
          reg,
          verification: reg.business
            ? businessVerification(reg.business.companyName, found?.name ?? null)
            : null,
          lookupRaw: found,
          emailVerifiedAt: now,
          ip: client.ip,
          opcIntent: groupIds,
          ...(sso ? { sso } : {}),
        });
        await this.fees.openFor(tx, u.id, reg.accountType);
        if (reg.referralCode) await this.referrals.attach(tx, u.id, reg.referralCode);
        await this.groups.requestJoin(tx, u.id, groupIds);
        await this.welcome.request(tx, { email: u.email, fullName: u.fullName });
        return u;
      })
      .catch((err: unknown) => {
        // Hai request kích hoạt cùng lúc: UQ email/phone chặn bản thứ hai
        if (isUniqueViolation(err)) throw conflict(REGISTER_MESSAGES.emailTaken);
        throw err;
      });
    await this.welcome.markUnseen(user.id, { email: user.email, fullName: user.fullName });
    return this.auth.startSession(user, client, { days: REFRESH_DAYS.session }, false, now);
  }

  async assertOpen(): Promise<void> {
    if (!(await this.settings.general()).openRegistration) {
      throw forbidden(REGISTER_MESSAGES.closed);
    }
  }

  private async start(reg: PendingRegistration): Promise<OtpSent> {
    await this.assertOpen();
    if (reg.referralCode) await this.referrals.validate(reg.referralCode, reg.email);
    if (reg.phone !== null && !isValidE164(reg.phone)) {
      throw validation('phone', REGISTER_MESSAGES.phoneInvalid);
    }
    if (!reg.fullName) reg.fullName = reg.email.split('@')[0] ?? reg.email;
    await this.assertAvailable(reg.email, reg.phone);
    await this.redis.client.set(pendingKey(reg.email), JSON.stringify(reg), 'EX', PENDING_TTL_SEC);
    await this.sendOtp(reg.email);
    return { email: reg.email, expiresInSec: OTP_TTL_SEC };
  }

  private async sendOtp(email: string): Promise<void> {
    const code = await this.otp.issue(OTP_PURPOSE, email);
    const m = otpMail(code, OTP_TTL_SEC / 60);
    await this.prisma.db.$transaction((tx) =>
      this.mail.request(tx, { to: email, kind: 'otp', subject: m.subject, html: m.html }),
    );
  }

  private async loadPending(email: string): Promise<PendingRegistration | null> {
    const raw = await this.redis.client.get(pendingKey(email));
    if (!raw) return null;
    const p = pendingRegistrationSchema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  }

  private async assertAvailable(email: string, phone: string | null): Promise<void> {
    const t = await this.repo.taken(email, phone);
    if (t.email)
      throw new AppError('CONFLICT', REGISTER_MESSAGES.emailTaken, [
        { path: 'email', message: REGISTER_MESSAGES.emailTaken },
      ]);
    if (t.phone)
      throw new AppError('CONFLICT', REGISTER_MESSAGES.phoneTaken, [
        { path: 'phone', message: REGISTER_MESSAGES.phoneTaken },
      ]);
  }

  /** Q-B11-1: mật khẩu được bỏ trống (đặt sau qua quên mật khẩu); có nhập thì phải đủ mạnh */
  private checkPassword(password: string): Promise<string | null> {
    return password ? this.policy.hashChecked(password, 'password') : Promise.resolve(null);
  }

  /** D-40: lỗi tra cứu không chặn đăng ký → coi như không khớp (pending) */
  private async lookupTax(taxCode: string): Promise<TaxInfo | null> {
    return this.biz.raw(taxCode).catch(() => null);
  }
}

const validation = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';
}
