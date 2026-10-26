import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { IntegrationError, type SsoFlow, type SsoProvider } from '@opchub/integrations';
import type { SsoCompleteRequest } from '@opchub/shared/api';
import { SSO_IDS, type SsoId } from '@opchub/shared/api-domains';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ENV, type Env } from '@/common/config';
import { AppError, forbidden, notFound, unauthorized } from '@/common/errors';
import { SSO } from '@/common/integrations';
import { RedisService } from '@/common/redis/redis.service';
import { AppSettingsService } from '@/modules/settings';
import { isValidE164, phoneToE164 } from '../domain/register.mapper';
import { ADMIN_EMAIL_PORT, type AdminEmailPort } from '../ports';
import { RegistrationRepository } from '../repositories/registration.repository';
import { UserRepository } from '../repositories/user.repository';
import { LOCKED_MESSAGE, AuthService, type SessionResult } from './auth.service';
import { RegisterService, REGISTER_MESSAGES } from './register.service';
import { SsoStateService } from './sso-state.service';
import { REFRESH_DAYS, type ClientInfo } from './token.service';

const TOKEN_TTL_SEC = 15 * 60;
export const SSO_ADMIN_FORBIDDEN = 'Tài khoản quản trị không đăng nhập bằng SSO';
export const SSO_STATE_INVALID = 'Phiên đăng nhập liên kết không hợp lệ, vui lòng thử lại';
const SSO_UNAVAILABLE = 'Không kết nối được nhà cung cấp đăng nhập, vui lòng thử lại';
const FLOWS: readonly SsoFlow[] = ['google', 'facebook', 'linkedin'];
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
const isFlow = (p: string): p is SsoFlow => (FLOWS as readonly string[]).includes(p);

/** So chuỗi không lộ thời gian; khác độ dài → false */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export interface SsoCallbackInput {
  flow: string;
  code: string;
  state: string;
  /** Giá trị cookie `opchub_sso` của trình duyệt — phải trùng `state` */
  cookieState: string | undefined;
}

/**
 * D-45 SSO: email đã có TK → đăng nhập luôn; chưa có → giữ danh tính 15' (`ssoToken`)
 * cho form bổ sung, `complete` tạo TK không cần OTP (provider đã xác thực email).
 * D-64: nút ChatGPT/Gemini/DeepSeek đi luồng Google; state/nonce/PKCE kiểm ở callback.
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
    private readonly states: SsoStateService,
    @Inject(SSO) private readonly provider: SsoProvider,
    @Inject(ENV) private readonly env: Env,
    @Optional() @Inject(ADMIN_EMAIL_PORT) private readonly admins: AdminEmailPort | null = null,
  ) {}

  private readonly logger = new Logger(SsoService.name);

  /** BUG-034, NA-17: luồng nằm trong path — authorize và exchange phải dùng cùng một URI */
  private redirectUri(flow: SsoFlow): string {
    return `${this.env.PORTAL_URL}/sso/callback/${flow}`;
  }

  /** Trả URL provider + `state` để controller ràng buộc vào cookie trình duyệt */
  async start(button: string): Promise<{ url: string; state: string }> {
    const id = await this.enabled(button);
    const flow = this.provider.flowOf(id);
    const { state, nonce, codeChallenge } = await this.states.create(id, flow);
    const url = this.provider.authorizeUrl(flow, {
      redirectUri: this.redirectUri(flow),
      state,
      nonce,
      codeChallenge,
    });
    return { url, state };
  }

  async callback(input: SsoCallbackInput, client: ClientInfo): Promise<SsoCallbackResult> {
    const { flow, code, state, cookieState } = input;
    if (!isFlow(flow)) throw notFound('Không hỗ trợ nhà cung cấp này');
    // D-64: chống CSRF/đăng nhập ép — state phải do chính trình duyệt này khởi tạo, dùng một lần
    if (!cookieState || !sameSecret(cookieState, state)) throw unauthorized(SSO_STATE_INVALID);
    const pending = await this.states.consume(state);
    if (!pending || pending.flow !== flow) throw unauthorized(SSO_STATE_INVALID);
    // Admin có thể tắt nút giữa lúc người dùng đang ở trang Google
    await this.enabled(pending.button);

    const who = await this.exchange(flow, {
      code,
      redirectUri: this.redirectUri(flow),
      codeVerifier: pending.codeVerifier,
      nonce: pending.nonce,
    });
    if (!who) throw unauthorized('Đăng nhập bằng tài khoản liên kết thất bại');
    const email = who.email.toLowerCase();
    // NA-17, RB-R03: TK quản trị (`admin_users`) không đăng nhập / đăng ký bằng SSO
    if (await this.admins?.isAdminEmail(email)) {
      throw new AppError('CONFLICT', SSO_ADMIN_FORBIDDEN);
    }

    // D-64: liên kết lưu theo luồng (nút ChatGPT… → `google`), subject = `sub` của provider
    const linked = await this.registrations.findByIdentity(flow, who.subject);
    const user = linked
      ? await this.users.findSession(linked.userId)
      : await this.registrations.findSessionByEmail(email);
    if (user) {
      if (user.status === 'locked') throw forbidden(LOCKED_MESSAGE);
      if (!linked) await this.registrations.linkIdentity(user.id, flow, who.subject, email);
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
    const identity = { provider: flow, subject: who.subject, email, fullName: who.fullName };
    await this.redis.client.set(tokenKey(ssoToken), JSON.stringify(identity), 'EX', TOKEN_TTL_SEC);
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
        groupIds: [...new Set(req.groupIds ?? [])],
        business: null,
        ...(req.referralCode ? { referralCode: req.referralCode } : {}),
      },
      client,
      { provider: p.data.provider, subject: p.data.subject },
    );
  }

  /** Lỗi mạng/5xx của provider → thông điệp chung; không log code/token */
  private async exchange(flow: SsoFlow, req: Parameters<SsoProvider['exchange']>[1]) {
    try {
      return await this.provider.exchange(flow, req);
    } catch (err) {
      if (!(err instanceof IntegrationError)) throw err;
      this.logger.warn({ provider: err.provider, reason: err.message }, 'SSO exchange lỗi');
      throw new AppError('INTERNAL', SSO_UNAVAILABLE);
    }
  }

  /** Nút bị Admin tắt (D-33) → 403; id lạ hoặc provider đang cấu hình không hỗ trợ → 404 */
  private async enabled(provider: string): Promise<SsoId> {
    if (!isSsoId(provider) || !this.provider.supports(provider)) {
      throw notFound('Không hỗ trợ nhà cung cấp này');
    }
    const { providers } = await this.settings.security();
    if (!providers.some((x) => x.id === provider && x.enabled)) {
      throw forbidden('Đăng nhập bằng nhà cung cấp này đang tắt');
    }
    return provider;
  }
}
