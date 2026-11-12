import { z } from 'zod';
import { adminLoginResponseSchema, apiErrorSchema, totpVerifySchema } from '@opchub/shared/api';
import { adminAccountRowSchema, adminAccountCreateSchema } from '@opchub/shared/api-domains';

export const PREFIX = 'tip824-auth-';
export interface FixtureAccount {
  email: string;
  name: string;
  password: string;
  nextPassword: string;
  roleId: string;
}
const SUPER = 'admin@opchub.community';
const login = z.object({ identifier: z.string(), password: z.string() });
const first = z.strictObject({ newPassword: z.string(), confirmPassword: z.string() });
const otp = z.object({ code: z.string().regex(/^\d{6}$/), mfaToken: z.string().optional() });

/** Dedicated approved auth protocol, never a relaxation of the loaded-state guard. */
export class AuthProtocol {
  readonly errors: string[] = [];
  readonly counts = new Map<string, number>();
  private fixture: FixtureAccount | null = null;
  private id: string | null = null;
  private principal: string | null = null;
  private loginEmail = '';
  private enabled = false;
  private challenge: string | null = null;
  private check(ok: boolean, code: string) {
    if (!ok) this.errors.push(code);
  }
  register(fixture: FixtureAccount) {
    if (this.fixture) throw new Error('Refusing duplicate fixture registration');
    if (
      !fixture.email.startsWith(PREFIX) ||
      !fixture.email.endsWith('@example.invalid') ||
      !fixture.name.startsWith(PREFIX)
    )
      throw new Error('Refusing non-owned auth fixture');
    this.fixture = fixture;
  }
  request(method: string, path: string, body: unknown) {
    if (!path.startsWith('/v1/') || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
    const key = path.replace('/v1/admin/', '');
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    if (method !== 'POST') return this.check(false, 'Non-POST mutation denied');
    if (path === '/v1/admin/auth/login') {
      const data = login.safeParse(body);
      this.loginEmail = data.success ? data.data.identifier : '';
      return this.check(
        this.loginEmail === SUPER || this.loginEmail === this.fixture?.email,
        'Unowned login denied',
      );
    }
    if (path === '/v1/admin/auth/refresh') return;
    if (path === '/v1/admin/auth/logout')
      return this.check(
        this.principal === SUPER || this.principal === this.fixture?.email,
        'Unowned logout denied',
      );
    if (path === '/v1/admin/admin-accounts') {
      const data = adminAccountCreateSchema.safeParse(body);
      return this.check(
        !!this.fixture &&
          data.success &&
          this.principal === SUPER &&
          !this.id &&
          data.data.email === this.fixture.email &&
          data.data.name === this.fixture.name &&
          data.data.roleId === this.fixture.roleId &&
          data.data.password === this.fixture.password,
        'Unowned account create denied',
      );
    }
    if (!this.fixture || this.principal !== this.fixture.email || !this.id)
      return this.check(false, 'Auth mutation requires verified owned principal');
    if (path === '/v1/admin/auth/first-password') {
      const data = first.safeParse(body);
      return this.check(
        data.success &&
          data.data.newPassword === this.fixture.nextPassword &&
          data.data.confirmPassword === this.fixture.nextPassword,
        'Password payload changed',
      );
    }
    if (path === '/v1/admin/auth/2fa/setup') return;
    if (path === '/v1/admin/auth/2fa/enable')
      return this.check(otp.safeParse(body).success, 'Noncanonical enable OTP');
    // Verification follows logout/challenge, so its principal check is performed below separately.
    this.check(false, 'Business mutation denied');
  }
  verifyRequest(body: unknown) {
    this.counts.set('auth/totp/verify', (this.counts.get('auth/totp/verify') ?? 0) + 1);
    const data = otp.safeParse(body);
    this.check(
      this.enabled && !!this.challenge && data.success && data.data.mfaToken === this.challenge,
      'Unexpected MFA verification',
    );
  }
  response(path: string, status: number, body: unknown) {
    if (!path.startsWith('/v1/')) return;
    if (path === '/v1/admin/auth/refresh' && status === 401) {
      this.check(this.principal === null, 'Unexpected authenticated refresh failure');
      return;
    }
    if (path === '/v1/admin/auth/login' && status === 401) {
      const data = apiErrorSchema.safeParse(body);
      const fields = data.success ? (data.data.error.fields ?? []) : [];
      const token = fields.find((field) => field.path === 'mfaToken')?.message;
      this.check(
        this.enabled &&
          this.loginEmail === this.fixture?.email &&
          data.success &&
          data.data.error.code === 'UNAUTHORIZED' &&
          fields.length === 1 &&
          totpVerifySchema.shape.mfaToken.safeParse(token).success,
        'Unexpected login401 or malformed MFA challenge',
      );
      this.challenge = token ?? null;
      this.counts.set('challenge', (this.counts.get('challenge') ?? 0) + 1);
      return;
    }
    this.check(status >= 200 && status < 300, `Unexpected HTTP ${status} ${path}`);
    if (path === '/v1/admin/admin-accounts' && status === 201) {
      const data = adminAccountRowSchema.safeParse(body);
      this.check(
        data.success &&
          data.data.email === this.fixture?.email &&
          data.data.roleId === this.fixture?.roleId &&
          !data.data.isSuperAdmin,
        'Created account identity mismatch',
      );
      if (data.success) this.id = data.data.id;
    }
    if (path === '/v1/admin/auth/logout' && status === 204) this.principal = null;
    if (
      /\/auth\/(login|refresh|first-password|2fa\/enable|totp\/verify)$/.test(path) &&
      status === 200
    ) {
      const data = adminLoginResponseSchema.safeParse(body);
      this.check(data.success, 'Invalid auth session DTO');
      if (!data.success) return;
      const me = data.data.admin;
      const owned = me.email === this.fixture?.email && me.id === this.id;
      const expected = path.endsWith('/login')
        ? me.email === this.loginEmail && (me.email === SUPER || owned)
        : path.endsWith('/refresh')
          ? me.email === SUPER || owned
          : owned;
      this.check(expected, 'Session identity mismatch');
      if (!expected) return;
      this.principal = me.email;
      if (path.endsWith('/2fa/enable')) this.enabled = me.twoFactor;
    }
  }
}
