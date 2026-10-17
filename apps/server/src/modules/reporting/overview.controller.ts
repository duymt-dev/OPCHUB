import { Controller, Get } from '@nestjs/common';
import {
  type AdminBadges,
  adminBadgesSchema,
  type AdminOverview,
  adminOverviewSchema,
} from '@opchub/shared/api-domains';
import {
  type AccessClaims,
  CurrentUser,
  RequirePermission,
  SkipMembershipFee,
} from '@/common/auth';
import { respond } from '@/common/http/zod';
import { OverviewService } from './overview.service';

/** Admin Tổng quan + badge sidebar (B44, Q-B44-1) */
@Controller('admin')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @RequirePermission('m.view')
  @Get('overview')
  async get(): Promise<AdminOverview> {
    return respond(adminOverviewSchema, await this.overview.overview());
  }

  /** Ai có ít nhất một quyền Admin (không paywall); không có quyền nào → 403 (luật 4) */
  @SkipMembershipFee()
  @Get('badges')
  async badges(@CurrentUser() user: AccessClaims): Promise<AdminBadges> {
    return respond(adminBadgesSchema, await this.overview.badges(user));
  }
}
