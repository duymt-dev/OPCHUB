import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import {
  type ManualMatchRequest,
  manualMatchSchema,
  unmatchedTxnPageSchema,
  unmatchedTxnQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { FeeTransactionsService } from '../services/fee-transactions.service';

/** Q-B15-2 — giao dịch không khớp (chưa có màn FE; API cho vận hành) */
@Controller('admin/fees/transactions')
export class AdminFeeTransactionsController {
  constructor(private readonly txns: FeeTransactionsService) {}

  @RequireAdmin('fees.view')
  @Get()
  async list(@ZodQuery(unmatchedTxnQuerySchema) q: z.infer<typeof unmatchedTxnQuerySchema>) {
    return respond(unmatchedTxnPageSchema, await this.txns.unmatched(q.before, q.size));
  }

  @RequireAdmin('fees.action')
  @Post(':id/match')
  @HttpCode(204)
  async match(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(manualMatchSchema) body: ManualMatchRequest,
  ): Promise<void> {
    await this.txns.match({ id: user.sub, ip: req.ip ?? null }, id, body.userId, body.reason);
  }
}
