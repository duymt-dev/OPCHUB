import { Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type ForgotPasswordRequest,
  forgotPasswordSchema,
  type LoginResponse,
  loginResponseSchema,
  type ResetPasswordRequest,
  resetPasswordSchema,
  type TotpVerifyRequest,
  totpVerifySchema,
} from '@opchub/shared/api';
import {
  type ChangePasswordRequest,
  changePasswordSchema,
  type RevokeSessionsResult,
  revokeSessionsResultSchema,
} from '@opchub/shared/api-domains';
import type { Request, Response } from 'express';
import { type AccessClaims, CurrentUser, Public, SkipMembershipFee } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { respond, ZodBody } from '@/common/http/zod';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { SessionService } from '../services/session.service';
import { clientInfo, readRefreshCookie, setRefreshCookie } from './session-cookie';

/** SRS §13 + Q-G3c-1: quên/đặt lại/đổi mật khẩu, thu hồi phiên khác, bước 2 TOTP (D-27) */
@Controller('auth')
export class PasswordController {
  constructor(
    private readonly reset: PasswordResetService,
    private readonly sessions: SessionService,
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Luôn 204 — không lộ email có tài khoản hay không */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password/forgot')
  @HttpCode(204)
  async forgot(@ZodBody(forgotPasswordSchema) body: ForgotPasswordRequest): Promise<void> {
    await this.reset.forgot(body.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password/reset')
  @HttpCode(204)
  async resetPassword(@ZodBody(resetPasswordSchema) body: ResetPasswordRequest): Promise<void> {
    await this.reset.reset(body.token, body.newPassword);
  }

  /** Cookie refresh chỉ gửi tới /v1/auth/* → đọc được để giữ thiết bị hiện tại */
  @SkipMembershipFee()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password/change')
  @HttpCode(204)
  async change(
    @CurrentUser() user: AccessClaims,
    @ZodBody(changePasswordSchema) body: ChangePasswordRequest,
    @Req() req: Request,
  ): Promise<void> {
    await this.sessions.changePassword(
      user.sub,
      body.currentPassword,
      body.newPassword,
      readRefreshCookie(req),
    );
  }

  /** TD-018: 5/phút/IP */
  @SkipMembershipFee()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sessions/revoke-others')
  @HttpCode(200)
  async revokeOthers(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
  ): Promise<RevokeSessionsResult> {
    const revoked = await this.sessions.revokeOthers(user.sub, readRefreshCookie(req));
    return respond(revokeSessionsResultSchema, { revoked });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('totp/verify')
  @HttpCode(200)
  async totp(
    @ZodBody(totpVerifySchema) body: TotpVerifyRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const s = await this.auth.completeMfa(body.mfaToken, body.code, clientInfo(req));
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent);
    return respond(loginResponseSchema, s.body);
  }
}
