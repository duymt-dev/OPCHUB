import { Controller, Get } from '@nestjs/common';
import type { z } from 'zod';
import {
  revenueDirectorParamsSchema,
  revenueBalanceSchema,
  revenueLedgerQuerySchema,
  revenueLedgerSchema,
  revenueMonthsQuerySchema,
  revenueMonthsSchema,
} from '@opchub/shared/api-domains';
import { RequireAdmin } from '@/common/auth';
import { respond, ZodParams, ZodQuery } from '@/common/http/zod';
import { RevenueLedgerService } from '../services/revenue-ledger.service';

@Controller('admin/affiliate/revenue/:directorId')
export class AdminRevenueLedgerController {
  constructor(private readonly service: RevenueLedgerService) {}

  @Get('shares')
  @RequireAdmin('affiliate.view')
  async shares(
    @ZodParams(revenueDirectorParamsSchema) p: z.infer<typeof revenueDirectorParamsSchema>,
    @ZodQuery(revenueLedgerQuerySchema) q: z.infer<typeof revenueLedgerQuerySchema>,
  ) {
    return respond(revenueLedgerSchema, await this.service.ledger(p.directorId, q));
  }

  @Get('balance')
  @RequireAdmin('affiliate.view')
  async balance(
    @ZodParams(revenueDirectorParamsSchema) p: z.infer<typeof revenueDirectorParamsSchema>,
  ) {
    return respond(revenueBalanceSchema, await this.service.balance(p.directorId));
  }

  @Get('months')
  @RequireAdmin('affiliate.view')
  async months(
    @ZodParams(revenueDirectorParamsSchema) p: z.infer<typeof revenueDirectorParamsSchema>,
    @ZodQuery(revenueMonthsQuerySchema) q: z.infer<typeof revenueMonthsQuerySchema>,
  ) {
    return respond(revenueMonthsSchema, await this.service.months(p.directorId, q));
  }
}
