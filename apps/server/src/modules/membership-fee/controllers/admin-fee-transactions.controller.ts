import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import {
  type ManualMatchRequest,
  manualMatchSchema,
  pendingFundraisingListSchema,
  pendingFundraisingQuerySchema,
  unmatchedTxnPageSchema,
  unmatchedTxnQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { FeeTransactionsService } from '../services/fee-transactions.service';

/** Q-B15-2 — giao dịch "Cần đối soát" + khớp tay vào phí thành viên hoặc Gói Gọi vốn (D-113 F3) */
@Controller('admin/fees')
export class AdminFeeTransactionsController {
  constructor(private readonly txns: FeeTransactionsService) {}

  @RequireAdmin('fees.view')
  @Get('transactions')
  async list(@ZodQuery(unmatchedTxnQuerySchema) q: z.infer<typeof unmatchedTxnQuerySchema>) {
    return respond(unmatchedTxnPageSchema, await this.txns.unmatched(q.before, q.size));
  }

  @RequireAdmin('fees.action')
  @Post('transactions/:id/match')
  @HttpCode(204)
  async match(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(manualMatchSchema) body: ManualMatchRequest,
  ): Promise<void> {
    const actor = { id: user.sub, ip: req.ip ?? null };
    if (body.kind === 'fundraising') {
      await this.txns.matchFundraising(actor, id, body.fundraisingId, body.reason);
    } else {
      await this.txns.match(actor, id, body.userId, body.reason);
    }
  }

  @RequireAdmin('fees.action')
  @Get('fundraisings/pending')
  async pendingFundraisings(
    @ZodQuery(pendingFundraisingQuerySchema) q: z.infer<typeof pendingFundraisingQuerySchema>,
  ) {
    return respond(pendingFundraisingListSchema, await this.txns.pendingFundraisings(q.q));
  }
}
