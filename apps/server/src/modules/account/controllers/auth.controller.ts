import { Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type LoginRequest,
  loginRequestSchema,
  type LoginResponse,
  loginResponseSchema,
} from '@opchub/shared/api';
import type { Request, Response } from 'express';
import { Public, SkipMembershipFee } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { unauthorized } from '@/common/errors';
import { respond, ZodBody } from '@/common/http/zod';
import { AuthService, type SessionResult } from '../services/auth.service';
import {
  assertAllowedOrigin,
  clearRefreshCookie,
  clientInfo,
  readRefreshCookie,
  setRefreshCookie,
} from './session-cookie';

/** SRS §13 Auth — login, refresh (xoay vòng), logout */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** security.md: đăng nhập 10/phút theo IP; khoá theo TK+IP ở LoginLockService (D-44) */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @ZodBody(loginRequestSchema) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.send(res, await this.auth.login(body, clientInfo(req)));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    assertAllowedOrigin(req, this.env);
    const token = readRefreshCookie(req);
    if (!token) throw unauthorized();
    try {
      return this.send(res, await this.auth.refresh(token, clientInfo(req)));
    } catch (err) {
      clearRefreshCookie(res, this.env);
      throw err;
    }
  }

  /** Đăng xuất được cả khi access token đã hết hạn → Public, thu hồi theo cookie. TD-018: 20/phút/IP */
  @Public()
  @SkipMembershipFee()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    assertAllowedOrigin(req, this.env);
    await this.auth.logout(readRefreshCookie(req));
    clearRefreshCookie(res, this.env);
  }

  private send(res: Response, s: SessionResult): LoginResponse {
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent);
    return respond(loginResponseSchema, s.body);
  }
}
