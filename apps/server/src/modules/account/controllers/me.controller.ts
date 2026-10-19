import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type OtpSent, otpSentSchema } from '@opchub/shared/api';
import {
  type EmailChangeRequest,
  emailChangeRequestSchema,
  type EmailChangeVerifyRequest,
  emailChangeVerifySchema,
  type Profile,
  profileSchema,
  type SsoLinkResult,
  ssoLinkResultSchema,
  type UpdateProfileRequest,
  updateProfileSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import type { Request, Response } from 'express';
import { respond, ZodBody } from '@/common/http/zod';
import { EmailChangeService } from '../services/email-change.service';
import { ProfileService } from '../services/profile.service';
import { clientInfo, setRefreshCookie } from './session-cookie';

const QUARTER = 15 * 60_000;

/**
 * SRS §13 `GET/PATCH /me` — trả `profileSchema` (superset của `meSchema`, FE cũ không vỡ)
 * + `POST/DELETE /me/sso/:provider` (Q-G3c-1) + đổi email có OTP `POST /me/email/{otp,verify}`
 * (BUG-030). Không cần phí: màn Hồ sơ vẫn mở khi chưa đóng.
 */
@Controller('me')
export class MeController {
  constructor(
    private readonly profiles: ProfileService,
    private readonly emailChange: EmailChangeService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @SkipMembershipFee()
  @Get()
  async me(@CurrentUser() user: AccessClaims): Promise<Profile> {
    return respond(profileSchema, await this.profiles.get(user.sub));
  }

  @SkipMembershipFee()
  @Patch()
  async update(
    @CurrentUser() user: AccessClaims,
    @ZodBody(updateProfileSchema) body: UpdateProfileRequest,
  ): Promise<Profile> {
    return respond(profileSchema, await this.profiles.update(user.sub, body));
  }

  @SkipMembershipFee()
  @Post('sso/:provider')
  async link(
    @CurrentUser() user: AccessClaims,
    @Param('provider') provider: string,
  ): Promise<SsoLinkResult> {
    return respond(ssoLinkResultSchema, await this.profiles.setSso(user.sub, provider, true));
  }

  @SkipMembershipFee()
  @Delete('sso/:provider')
  async unlink(
    @CurrentUser() user: AccessClaims,
    @Param('provider') provider: string,
  ): Promise<SsoLinkResult> {
    return respond(ssoLinkResultSchema, await this.profiles.setSso(user.sub, provider, false));
  }

  /** BUG-030: OTP tới email MỚI — 5 lần / 15 phút / IP (+ 3 lần gửi / 15 phút / email ở OtpService) */
  @SkipMembershipFee()
  @Throttle({ default: { limit: 5, ttl: QUARTER } })
  @Post('email/otp')
  @HttpCode(200)
  async emailOtp(
    @CurrentUser() user: AccessClaims,
    @ZodBody(emailChangeRequestSchema) body: EmailChangeRequest,
  ): Promise<OtpSent> {
    return respond(otpSentSchema, await this.emailChange.request(user.sub, body.newEmail));
  }

  /**
   * BUG-030: đúng mã → đổi email, thu hồi mọi phiên khác. Thiết bị hiện tại nhận chuỗi refresh
   * mới (Set-Cookie path `/v1/auth` đặt được từ response này) nên không bị đăng xuất.
   */
  @SkipMembershipFee()
  @Throttle({ default: { limit: 10, ttl: QUARTER } })
  @Post('email/verify')
  @HttpCode(200)
  async emailVerify(
    @CurrentUser() user: AccessClaims,
    @ZodBody(emailChangeVerifySchema) body: EmailChangeVerifyRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Profile> {
    const r = await this.emailChange.verify(user.sub, body.newEmail, body.code, clientInfo(req));
    const s = r.session;
    setRefreshCookie(res, this.env, s.refreshToken, s.refreshExpiresAt, s.persistent);
    return respond(profileSchema, r.profile);
  }
}
