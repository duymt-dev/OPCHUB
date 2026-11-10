import { Controller, HttpCode, Inject, Patch, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  adminChangePasswordSchema,
  adminUpdateProfileSchema,
  adminMeSchema,
  adminLoginResponseSchema,
  type AdminChangePasswordRequest,
  type AdminUpdateProfileRequest,
} from '@opchub/shared/api';
import type { Request, Response } from 'express';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { respond, ZodBody } from '@/common/http/zod';
import { ADMIN_COOKIE, clientInfo, setRefreshCookie } from '@/modules/account';
import { AdminProfileService } from '../services/admin-profile.service';

/** Full Admin session, no menu permission: every administrator may manage only themselves. */
@Controller('admin/auth')
export class AdminProfileController {
  constructor(
    private readonly profile: AdminProfileService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Patch('me')
  async update(
    @CurrentUser() user: AccessClaims,
    @ZodBody(adminUpdateProfileSchema) body: AdminUpdateProfileRequest,
    @Req() req: Request,
  ) {
    return respond(
      adminMeSchema,
      await this.profile.updateProfile(user.sub, body, clientInfo(req)),
    );
  }

  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async change(
    @CurrentUser() user: AccessClaims,
    @ZodBody(adminChangePasswordSchema, { raw: true }) body: AdminChangePasswordRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.profile.changePassword(user.sub, body, clientInfo(req));
    setRefreshCookie(
      res,
      this.env,
      session.refreshToken,
      session.refreshExpiresAt,
      session.persistent,
      ADMIN_COOKIE,
    );
    return respond(adminLoginResponseSchema, session.body);
  }
}
