import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  affiliateCancelResultSchema,
  affiliateCancelSchema,
  affiliateCommissionQuerySchema,
  affiliateCommissionsSchema,
  affiliateExportSchema,
  affiliateSummaryQuerySchema,
  affiliateSummarySchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { AffiliateAdminService } from '../services/affiliate-admin.service';
import { AffiliateCsvService } from '../services/affiliate-csv.service';
import { CommissionAdminService } from '../services/commission-admin.service';

@Controller('admin/affiliate')
export class AdminAffiliateCommissionsController {
  constructor(
    private readonly read: AffiliateAdminService,
    private readonly write: CommissionAdminService,
    private readonly csv: AffiliateCsvService,
  ) {}

  @Get('summary')
  @RequireAdmin('affiliate.view')
  async summary(
    @ZodQuery(affiliateSummaryQuerySchema) q: z.infer<typeof affiliateSummaryQuerySchema>,
  ) {
    return respond(affiliateSummarySchema, await this.read.summary(q.month));
  }

  @Get('commissions')
  @RequireAdmin('affiliate.view')
  async list(
    @ZodQuery(affiliateCommissionQuerySchema) q: z.infer<typeof affiliateCommissionQuerySchema>,
  ) {
    return respond(affiliateCommissionsSchema, await this.read.commissionsPage(q));
  }

  @Post('commissions/cancel')
  @HttpCode(200)
  @RequireAdmin('affiliate.action')
  async cancel(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(affiliateCancelSchema) body: z.infer<typeof affiliateCancelSchema>,
  ) {
    return respond(
      affiliateCancelResultSchema,
      await this.write.cancel({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }

  @Post('commissions/export')
  @HttpCode(200)
  @RequireAdmin('affiliate.action')
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(affiliateExportSchema) body: z.infer<typeof affiliateExportSchema>,
  ) {
    return respond(
      csvFileSchema,
      await this.csv.commissionsFile({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }
}
