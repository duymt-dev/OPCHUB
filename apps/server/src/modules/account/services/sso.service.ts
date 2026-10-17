import { Inject, Injectable } from '@nestjs/common';
import type { SsoProvider } from '@opchub/integrations';
import type { SsoCompleteRequest } from '@opchub/shared/api';
import { SSO_IDS, type SsoId } from '@opchub/shared/api-domains';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ENV, type Env } from '@/common/config';
import { AppError, forbidden, notFound, unauthorized } from '@/common/errors';
import { SSO } from '@/common/integrations';
import { RedisService } from '@/common/redis/redis.service';
import { AppSettingsService } from '@/modules/settings';
import { isValidE164, phoneToE164 } from '../domain/register.mapper';
import { RegistrationRepository } from '../repositories/registration.repository';
import { UserRepository } from '../repositories/user.repository';
import { LOCKED_MESSAGE, AuthService, type SessionResult } from './auth.service';
import { RegisterService, REGISTER_MESSAGES } from './register.service';
import { REFRESH_DAYS, type ClientInfo } from './token.service';

const TOKEN_TTL_SEC = 15 * 60;
const tokenKey = (t: string) => `sso:pending:${t}`;
const pendingSchema = z.object({
  provider: z.enum(SSO_IDS),
  subject: z.string(),
  email: z.string(),
  fullName: z.string(),
});

export type SsoCallbackResult =
  | { status: 'existing'; session: SessionResult }
  | { status: 'new'; ssoToken: string; email: string; fullName: string };

const isSsoId = (p: string): p is SsoId => (SSO_IDS as readonly string[]).includes(p);

/**
 * D-45 SSO: email đã có TK → đăng nhập luôn; chưa có → giữ danh tính 15' (`ssoToken`)
 * cho form bổ sung, `complete` tạo TK không cần OTP (provider đã xác thực email).
 */
@Injectable()
export class SsoService {
  constructor(
    private readonly redis: RedisService,
    private readonly settings: AppSettingsService,
    private readonly registrations: RegistrationRepository,
    private readonly users: UserRepository,
    private readonly auth: AuthService,
    private readonly register: RegisterService,
    @Inject(SSO) private readonly provider: SsoProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private redirectUri(): string {
    return `${this.env.PORTAL_URL}/sso/callback`;
  }

  async authorizeUrl(provider: string): Promise<string> {
    const id = await this.enabled(provider);
    return this.provider.authorizeUrl(id, this.redirectUri(), randomBytes(16).toString('hex'));
  }

  async callback(provider: string, code: string, client: ClientInfo): Promise<SsoCallbackResult> {
    const id = await this.enabled(provider);
    const who = await this.provider.exchange(id, code, this.redirectUri());
    if (!who) throw unauthorized('Đăng nhập bằng tài khoản liên kết thất bại');
    const email = who.email.toLowerCase();

    const linked = await this.registrations.findByIdentity(id, who.subject);
    const user = linked
      ? await this.users.findSession(linked.userId)
      : await this.registrations.findSessionByEmail(email);
    if (user) {
      if (user.status === 'locked') throw forbidden(LOCKED_MESSAGE);
      const session = await this.auth.startSession(
        user,
        client,
        { days: REFRESH_DAYS.session },
        false,
        new Date(),
      );
      return { status: 'existing', session };
    }

    await this.register.assertOpen();
    const ssoToken = randomBytes(24).toString('base64url');
    const pending = { provider: id, subject: who.subject, email, fullName: who.fullName };
    await this.redis.client.set(tokenKey(ssoToken), JSON.stringify(pending), 'EX', TOKEN_TTL_SEC);
    return { status: 'new', ssoToken, email, fullName: who.fullName };
  }

  async complete(req: SsoCompleteRequest, client: ClientInfo): Promise<SessionResult> {
    const raw = await this.redis.client.getdel(tokenKey(req.ssoToken));
    const p = raw ? pendingSchema.safeParse(JSON.parse(raw)) : null;
    if (!p?.success) throw unauthorized('Phiên đăng ký SSO đã hết hạn, vui lòng thử lại');
    const phone = phoneToE164(req.phone);
    if (phone !== null && !isValidE164(phone)) {
      throw new AppError('VALIDATION_ERROR', REGISTER_MESSAGES.phoneInvalid, [
        { path: 'phone', message: REGISTER_MESSAGES.phoneInvalid },
      ]);
    }
    return this.register.activate(
      {
        accountType: req.accountType,
        email: p.data.email,
        fullName: p.data.fullName,
        phone,
        country: req.phone.country,
        passwordHash: null,
        registrationRole: null,
        position: null,
        groupIds: [...new Set(req.groupIds)],
        business: null,
      },
      client,
      { provider: p.data.provider, subject: p.data.subject },
    );
  }

  /** Provider bị Admin tắt (D-33) → 403; id lạ → 404 */
  private async enabled(provider: string): Promise<SsoId> {
    if (!isSsoId(provider)) throw notFound('Không hỗ trợ nhà cung cấp này');
    const { providers } = await this.settings.security();
    if (!providers.some((x) => x.id === provider && x.enabled)) {
      throw forbidden('Đăng nhập bằng nhà cung cấp này đang tắt');
    }
    return provider;
  }
}
