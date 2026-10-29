import { Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { affiliatePolicySchema, type AffiliatePolicy } from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { AffiliatePolicyService } from '../services/affiliate-policy.service';

/** D-70 (V4-602): bỏ `GET preview` — tab Chính sách v4 hiện giá gói từ Cấu hình bảng giá (D-94 5A) */
@Controller('admin/affiliate/policy')
export class AdminAffiliatePolicyController {
  constructor(private readonly policy: AffiliatePolicyService) {}

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
