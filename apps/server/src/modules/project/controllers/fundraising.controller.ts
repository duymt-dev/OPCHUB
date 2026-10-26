import { Controller, Get, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import {
  type FundraisingPayment,
  fundraisingConfirmSchema,
  fundraisingPaymentSchema,
  fundraisingReviewSchema,
  myFundraisingsSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { IdempotencyService } from '@/common/idempotency';
import { FundraisingService } from '../services/fundraising.service';
import { FundraisingReviewService } from '../services/fundraising-review.service';

/** V4-610 (UP-11): Gói Gọi vốn — chủ dự án đã đóng phí (paywall mặc định), NĐT không mua */
@Controller()
export class FundraisingController {
  constructor(
    private readonly fundraising: FundraisingService,
    private readonly idem: IdempotencyService,
  ) {}

  /** Khoản chờ thanh toán (idempotent theo dự án: đã có thì trả lại cùng mã) */
  @Post('projects/:id/fundraising')
  @HttpCode(200)
  async start(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<FundraisingPayment> {
    return respond(fundraisingPaymentSchema, await this.fundraising.start(user.sub, id));
  }

  @Get('me/fundraisings')
  async mine(@CurrentUser() user: AccessClaims): Promise<z.infer<typeof myFundraisingsSchema>> {
    return respond(myFundraisingsSchema, await this.fundraising.mine(user.sub));
  }

  /** D-31: 202 — chuyển "chờ thẩm định" khi webhook ngân hàng về */
  @Post('me/fundraisings/:id/transfer-confirm')
  @HttpCode(202)
  async confirm(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
  ): Promise<z.infer<typeof fundraisingConfirmSchema>> {
    const body = await this.idem.run(
      'fundraising-confirm',
      user.sub,
      key,
      fundraisingConfirmSchema,
      () => this.fundraising.confirm(user.sub, id),
    );
    return respond(fundraisingConfirmSchema, body);
  }
}

/** AD-06: Admin › Dự án — thẩm định Gói Gọi vốn (`projects.action`, audit cùng transaction) */
@Controller('admin/projects')
export class AdminFundraisingController {
  constructor(private readonly review: FundraisingReviewService) {}

  @RequireAdmin('projects.action')
  @Post(':id/fundraising/:fid/review')
  @HttpCode(204)
  async decide(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @Param('fid') fid: string,
    @ZodBody(fundraisingReviewSchema) body: z.infer<typeof fundraisingReviewSchema>,
  ): Promise<void> {
    await this.review.review(
      { id: user.sub, ip: req.ip ?? null },
      id,
      fid,
      body.decision,
      body.note,
    );
  }
}
