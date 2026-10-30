import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  revenueDirectorParamsSchema,
  revenuePayoutHistoryQuerySchema,
  revenuePayoutHistorySchema,
  revenuePayoutRequestSchema,
  revenuePayoutSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { RevenuePayoutService } from '../services/revenue-payout.service';

@Controller('admin/affiliate/revenue')
export class AdminRevenuePayoutsController {
  constructor(private readonly service: RevenuePayoutService) {}

  @Get('payouts')
  @RequireAdmin('affiliate.view')
  async history(
    @ZodQuery(revenuePayoutHistoryQuerySchema) q: z.infer<typeof revenuePayoutHistoryQuerySchema>,
  ) {
    return respond(revenuePayoutHistorySchema, await this.service.history(q));
  }

  @Post(':directorId/payouts')
  @HttpCode(200)
  @RequireAdmin('affiliate.payout')
  async record(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(revenueDirectorParamsSchema) params: z.infer<typeof revenueDirectorParamsSchema>,
    @ZodBody(revenuePayoutRequestSchema) body: z.infer<typeof revenuePayoutRequestSchema>,
  ) {
    return respond(
      revenuePayoutSchema,
      await this.service.record(
        { id: user.sub, ip: req.ip ?? null },
        params.directorId,
        body.monthKey,
        req.get('Idempotency-Key'),
      ),
    );
  }
}
