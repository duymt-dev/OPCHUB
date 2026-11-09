import { Controller, Get } from '@nestjs/common';
import {
  type AdminBadges,
  adminBadgesSchema,
  type AdminOverview,
  adminOverviewSchema,
  type AdminOverviewQuery,
  adminOverviewQuerySchema,
} from '@opchub/shared/api-domains';
import {
  type AccessClaims,
  CurrentUser,
  RequireAdmin,
  RequireAnyAdmin,
  SkipMembershipFee,
} from '@/common/auth';
import { ADMIN_PERMISSION_KEYS } from '@opchub/shared';
import { respond, ZodQuery } from '@/common/http/zod';
import { OverviewService } from './overview.service';

/** Admin Tổng quan + badge sidebar (B44, Q-B44-1) */
@Controller('admin')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @RequireAdmin('overview.view')
  @Get('overview')
  async get(@ZodQuery(adminOverviewQuerySchema) query: AdminOverviewQuery): Promise<AdminOverview> {
    return respond(adminOverviewSchema, await this.overview.overview(new Date(), query));
  }

  /** Ai có ít nhất một quyền Admin; đếm theo khoá menu của người gọi (luật 4) */
  @RequireAnyAdmin(...ADMIN_PERMISSION_KEYS)
  @SkipMembershipFee()
  @Get('badges')
  async badges(@CurrentUser() user: AccessClaims): Promise<AdminBadges> {
    return respond(adminBadgesSchema, await this.overview.badges(user));
  }
}
