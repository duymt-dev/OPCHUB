import { Controller, Get, HttpCode, Inject, Param, Post, Redirect, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type LoginResponse,
  loginResponseSchema,
  type SsoCallback,
  ssoCallbackSchema,
  type SsoCompleteRequest,
  ssoCompleteSchema,
} from '@opchub/shared/api';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Public } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { SsoService } from '../services/sso.service';
import { clientInfo, setRefreshCookie } from './session-cookie';

const callbackQuery = z.object({ code: z.string().min(1).max(500) });

/** SRS §13 SSO (D-45). Provider thật chờ OQ-04; dev/test dùng FakeSsoProvider */
@Controller('auth/sso')
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @ZodQuery(callbackQuery) q: z.infer<typeof callbackQuery>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SsoCallback> {
    const r = await this.sso.callback(provider, q.code, clientInfo(req));
    if (r.status === 'new') return respond(ssoCallbackSchema, r);
    const s = r.session;
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent);
    return respond(ssoCallbackSchema, { status: 'existing', ...s.body });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('complete')
  @HttpCode(200)
  async complete(
    @ZodBody(ssoCompleteSchema) body: SsoCompleteRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const s = await this.sso.complete(body, clientInfo(req));
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent);
    return respond(loginResponseSchema, s.body);
  }

  /** Bắt đầu OAuth: chuyển hướng tới provider (FE điều hướng toàn trang) */
  @Public()
  @Get(':provider')
  @Redirect()
  async start(@Param('provider') provider: string): Promise<{ url: string; statusCode: number }> {
    return { url: await this.sso.authorizeUrl(provider), statusCode: 302 };
  }
}
