import { Controller, Get, Headers, HttpCode, Patch, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  affiliateAdminCustomersSchema,
  affiliateAdminPageSchema,
  affiliateBulkRateSchema,
  affiliateDetailSchema,
  affiliateExportSchema,
  affiliateIdParamsSchema,
  affiliateMonthsSchema,
  affiliatePageQuerySchema,
  affiliatePayoutKeySchema,
  affiliatePayoutRequestSchema,
  affiliatePayoutResultSchema,
  affiliateRateResultSchema,
  affiliateRateSchema,
  csvFileSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { AffiliateAdminService } from '../services/affiliate-admin.service';
import { AffiliateCsvService } from '../services/affiliate-csv.service';
import { CommissionAdminService } from '../services/commission-admin.service';
import { PayoutService } from '../services/payout.service';

@Controller('admin/affiliates')
export class AdminAffiliatesController {
  constructor(
    private readonly read: AffiliateAdminService,
    private readonly write: CommissionAdminService,
    private readonly payout: PayoutService,
    private readonly csv: AffiliateCsvService,
  ) {}

  @Get()
  @RequireAdmin('affiliate.view')
  async list(@ZodQuery(affiliatePageQuerySchema) q: z.infer<typeof affiliatePageQuerySchema>) {
    return respond(affiliateAdminPageSchema, await this.read.page(q));
  }

  @Put('rate')
  @RequireAdmin('affiliate.action')
  async rate(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(affiliateBulkRateSchema) body: z.infer<typeof affiliateBulkRateSchema>,
  ) {
    return respond(
      affiliateRateResultSchema,
      await this.write.rate({ id: user.sub, ip: req.ip ?? null }, body.ids, body.rate),
    );
  }

  @Post('export')
  @HttpCode(200)
  @RequireAdmin('affiliate.action')
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(affiliateExportSchema) body: z.infer<typeof affiliateExportSchema>,
  ) {
    return respond(
      csvFileSchema,
      await this.csv.affiliatesFile({ id: user.sub, ip: req.ip ?? null }, body),
    );
  }

  @Get(':id')
  @RequireAdmin('affiliate.view')
  async detail(@ZodParams(affiliateIdParamsSchema) p: z.infer<typeof affiliateIdParamsSchema>) {
    return respond(affiliateDetailSchema, await this.read.detail(p.id));
  }

  @Patch(':id')
  @RequireAdmin('affiliate.action')
  async patch(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(affiliateIdParamsSchema) p: z.infer<typeof affiliateIdParamsSchema>,
    @ZodBody(affiliateRateSchema) body: z.infer<typeof affiliateRateSchema>,
  ) {
    return respond(
      affiliateRateResultSchema,
      await this.write.rate({ id: user.sub, ip: req.ip ?? null }, [p.id], body.rate),
    );
  }

  @Get(':id/months')
  @RequireAdmin('affiliate.view')
  async months(
    @ZodParams(affiliateIdParamsSchema) p: z.infer<typeof affiliateIdParamsSchema>,
    @ZodQuery(affiliatePageQuerySchema) q: z.infer<typeof affiliatePageQuerySchema>,
  ) {
    return respond(affiliateMonthsSchema, await this.read.months(p.id, q));
  }

  @Get(':id/customers')
  @RequireAdmin('affiliate.view')
  async customers(
    @ZodParams(affiliateIdParamsSchema) p: z.infer<typeof affiliateIdParamsSchema>,
    @ZodQuery(affiliatePageQuerySchema) q: z.infer<typeof affiliatePageQuerySchema>,
  ) {
    return respond(affiliateAdminCustomersSchema, await this.read.customers(p.id, q));
  }

  @Post(':id/payouts')
  @HttpCode(200)
  @RequireAdmin('affiliate.payout')
  async pay(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(affiliateIdParamsSchema) p: z.infer<typeof affiliateIdParamsSchema>,
    @ZodBody(affiliatePayoutRequestSchema) body: z.infer<typeof affiliatePayoutRequestSchema>,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    const { idempotencyKey } = affiliatePayoutKeySchema.parse({ idempotencyKey: key });
    return respond(
      affiliatePayoutResultSchema,
      await this.payout.record(
        { id: user.sub, ip: req.ip ?? null },
        p.id,
        body.monthKey,
        idempotencyKey,
      ),
    );
  }
}
