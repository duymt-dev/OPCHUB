import { Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  affiliatePolicySchema,
  affiliateAdminPolicyPreviewQuerySchema,
  affiliateAdminPolicyPreviewSchema,
  type AffiliatePolicy,
  type AffiliateAdminPolicyPreviewQuery,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { AffiliatePolicyService } from '../services/affiliate-policy.service';

@Controller('admin/affiliate/policy')
export class AdminAffiliatePolicyController {
  constructor(private readonly policy: AffiliatePolicyService) {}

  @Get('preview')
  @RequireAdmin('affiliate.view')
  preview(
    @ZodQuery(affiliateAdminPolicyPreviewQuerySchema) query: AffiliateAdminPolicyPreviewQuery,
  ) {
    return respond(affiliateAdminPolicyPreviewSchema, this.policy.preview(query.rate));
  }

  @Get()
  @RequireAdmin('affiliate.view')
  async get() {
    return respond(affiliatePolicySchema, await this.policy.get());
  }

  @Put()
  @RequireAdmin('affiliate.action')
  async put(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(affiliatePolicySchema) body: AffiliatePolicy,
  ) {
    return respond(
      affiliatePolicySchema,
      await this.policy.update({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
}
