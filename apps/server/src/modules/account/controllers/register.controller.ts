import { Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type BizLookup,
  bizLookupSchema,
  type LoginResponse,
  loginResponseSchema,
  type OtpSent,
  otpResendSchema,
  otpSentSchema,
  type OtpVerifyRequest,
  otpVerifySchema,
  type RegisterBusinessRequest,
  registerBusinessSchema,
  type RegisterPersonalRequest,
  registerPersonalSchema,
} from '@opchub/shared/api';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Public } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { BizLookupService } from '../services/biz-lookup.service';
import { RegisterService } from '../services/register.service';
import { clientInfo, setRefreshCookie } from './session-cookie';

const QUARTER = 15 * 60_000;
const lookupQuery = z.object({ tax: z.string().default('') });

/** SRS §13 QT-01 — đăng ký, OTP, tra MST. Giới hạn theo IP ở đây; theo email ở OtpService */
@Controller()
export class RegisterController {
  constructor(
    private readonly register: RegisterService,
    private readonly biz: BizLookupService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: QUARTER } })
  @Post('auth/register/personal')
  @HttpCode(202)
  async personal(@ZodBody(registerPersonalSchema) body: RegisterPersonalRequest): Promise<OtpSent> {
    return respond(otpSentSchema, await this.register.registerPersonal(body));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: QUARTER } })
  @Post('auth/register/business')
  @HttpCode(202)
  async business(@ZodBody(registerBusinessSchema) body: RegisterBusinessRequest): Promise<OtpSent> {
    return respond(otpSentSchema, await this.register.registerBusiness(body));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('auth/otp/verify')
  @HttpCode(200)
  async verify(
    @ZodBody(otpVerifySchema) body: OtpVerifyRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const s = await this.register.verify(body.email, body.code, clientInfo(req));
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent);
    return respond(loginResponseSchema, s.body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: QUARTER } })
  @Post('auth/otp/resend')
  @HttpCode(202)
  async resend(@ZodBody(otpResendSchema) body: { email: string }): Promise<OtpSent> {
    return respond(otpSentSchema, await this.register.resend(body.email));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('biz/lookup')
  async lookup(@ZodQuery(lookupQuery) q: z.infer<typeof lookupQuery>): Promise<BizLookup> {
    return respond(bizLookupSchema, await this.biz.lookup(q.tax));
  }
}
