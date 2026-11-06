import { Controller, Get, Post, HttpCode, Headers, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  regionalShareQuerySchema,
  regionalSharePageQuerySchema,
  regionalParamsSchema,
  regionalPayoutBodySchema,
  regionalPayoutResultSchema,
  regionalShareSummarySchema,
  regionalSharePageSchema,
  regionalPayoutHistorySchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { RegionalShareReadService } from '../services/regional-share-read.service';
import { RegionalPayoutService } from '../services/regional-payout.service';

@Controller('admin/gdv')
export class AdminRegionalSharesController {
  constructor(
    private readonly read: RegionalShareReadService,
    private readonly payout: RegionalPayoutService,
  ) {}
  @Get('shares')
  @RequireAdmin('affiliate.view')
  async list(@ZodQuery(regionalShareQuerySchema) q: z.infer<typeof regionalShareQuerySchema>) {
    return respond(regionalShareSummarySchema, await this.read.list(q.q));
  }
  @Get(':region/shares')
  @RequireAdmin('affiliate.view')
  async page(
    @ZodParams(regionalParamsSchema) p: z.infer<typeof regionalParamsSchema>,
    @ZodQuery(regionalSharePageQuerySchema) q: z.infer<typeof regionalSharePageQuerySchema>,
  ) {
    return respond(regionalSharePageSchema, await this.read.page(p.region, q.limit, q.cursor));
  }
  @Get(':region/payouts')
  @RequireAdmin('affiliate.view')
  async history(@ZodParams(regionalParamsSchema) p: z.infer<typeof regionalParamsSchema>) {
    return respond(regionalPayoutHistorySchema, await this.read.history(p.region));
  }
  @Post(':region/payouts')
  @HttpCode(200)
  @RequireAdmin('affiliate.payout')
  async record(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(regionalParamsSchema) p: z.infer<typeof regionalParamsSchema>,
    @ZodBody(regionalPayoutBodySchema) body: z.infer<typeof regionalPayoutBodySchema>,
    @Headers('idempotency-key') key: string | undefined,
  ) {
    return respond(
      regionalPayoutResultSchema,
      await this.payout.record(
        { id: user.sub, role: user.roleName ?? '', ip: req.ip ?? null },
        p.region,
        body.directorUserId,
        key,
      ),
    );
  }
}
