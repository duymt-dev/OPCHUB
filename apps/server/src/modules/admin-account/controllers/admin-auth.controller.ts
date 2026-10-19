import { Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ADMIN_AUTH_MESSAGES,
  type AdminFirstPasswordRequest,
  adminFirstPasswordSchema,
  type AdminLoginResponse,
  adminLoginResponseSchema,
  type AdminMe,
  adminMeSchema,
  type AdminTwoFactorEnableRequest,
  adminTwoFactorEnableSchema,
  type AdminTwoFactorSetup,
  adminTwoFactorSetupSchema,
  type LoginRequest,
  loginRequestSchema,
  type TotpVerifyRequest,
  totpVerifySchema,
} from '@opchub/shared/api';
import type { Request, Response } from 'express';
import { type AccessClaims, AdminSetupAllowed, CurrentUser, Public } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { AppError, unauthorized } from '@/common/errors';
import { respond, ZodBody } from '@/common/http/zod';
import {
  ADMIN_COOKIE,
  assertAllowedOrigin,
  clearRefreshCookie,
  clientInfo,
  readRefreshCookie,
  setRefreshCookie,
} from '@/modules/account';
import { AdminAuthService } from '../services/admin-auth.service';
import type { AdminSessionResult } from '../services/admin-session.service';

/**
 * Phiên Admin (TIP-V2-202, D-62): cookie refresh riêng `opchub_art` path `/v1/admin/auth`.
 * Không có SSO (NA-17). Đổi mật khẩu tạm / thiết lập 2FA dùng được trong phiên hạn chế.
 */
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AdminAuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** security.md: 10/phút theo IP; khoá theo TK+IP ở LoginLockService (NA-15) */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @ZodBody(loginRequestSchema) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminLoginResponse> {
    return this.send(res, await this.auth.login(body, clientInfo(req)));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('totp/verify')
  @HttpCode(200)
  async totp(
    @ZodBody(totpVerifySchema) body: TotpVerifyRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminLoginResponse> {
    return this.send(res, await this.auth.completeMfa(body.mfaToken, body.code, clientInfo(req)));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminLoginResponse> {
    assertAllowedOrigin(req, this.env);
    const token = readRefreshCookie(req, ADMIN_COOKIE);
    if (!token) throw unauthorized();
    try {
      return this.send(res, await this.auth.refreshSession(token, clientInfo(req)));
    } catch (err) {
      clearRefreshCookie(res, this.env, ADMIN_COOKIE);
      throw err;
    }
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    assertAllowedOrigin(req, this.env);
    await this.auth.logout(readRefreshCookie(req, ADMIN_COOKIE), req.ip ?? null);
    clearRefreshCookie(res, this.env, ADMIN_COOKIE);
  }

  @AdminSetupAllowed()
  @Get('me')
  async me(@CurrentUser() user: AccessClaims): Promise<AdminMe> {
    return respond(adminMeSchema, await this.auth.me(user.sub));
  }

  /** SEC-R01 (AT-SEC01) */
  @AdminSetupAllowed()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('first-password')
  @HttpCode(200)
  async firstPassword(
    @CurrentUser() user: AccessClaims,
    @ZodBody(adminFirstPasswordSchema) body: AdminFirstPasswordRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminLoginResponse> {
    return this.send(res, await this.auth.firstPassword(user.sub, body, clientInfo(req)));
  }

  /** SEC-R02: chưa đổi mật khẩu tạm thì chưa được thiết lập 2FA (thứ tự §22.2) */
  @AdminSetupAllowed()
  @Post('2fa/setup')
  @HttpCode(200)
  async setup2fa(@CurrentUser() user: AccessClaims): Promise<AdminTwoFactorSetup> {
    this.assertPasswordChanged(user);
    return respond(adminTwoFactorSetupSchema, await this.auth.setupTwoFactor(user.sub));
  }

  @AdminSetupAllowed()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/enable')
  @HttpCode(200)
  async enable2fa(
    @CurrentUser() user: AccessClaims,
    @ZodBody(adminTwoFactorEnableSchema) body: AdminTwoFactorEnableRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdminLoginResponse> {
    this.assertPasswordChanged(user);
    return this.send(res, await this.auth.enableTwoFactor(user.sub, body.code, clientInfo(req)));
  }

  private assertPasswordChanged(user: AccessClaims): void {
    if (user.restricted === 'password') {
      throw new AppError('PASSWORD_CHANGE_REQUIRED', ADMIN_AUTH_MESSAGES.passwordChangeRequired);
    }
  }

  private send(res: Response, s: AdminSessionResult): AdminLoginResponse {
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent, ADMIN_COOKIE);
    return respond(adminLoginResponseSchema, s.body);
  }
}
