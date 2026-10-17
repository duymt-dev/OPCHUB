import { Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  type Profile,
  profileSchema,
  type SsoLinkResult,
  ssoLinkResultSchema,
  type UpdateProfileRequest,
  updateProfileSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { ProfileService } from '../services/profile.service';

/**
 * SRS §13 `GET/PATCH /me` — trả `profileSchema` (superset của `meSchema`, FE cũ không vỡ)
 * + `POST/DELETE /me/sso/:provider` (Q-G3c-1). Không cần phí: màn Hồ sơ vẫn mở khi chưa đóng.
 */
@Controller('me')
export class MeController {
  constructor(private readonly profiles: ProfileService) {}

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
}
