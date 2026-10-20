import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  affiliateClickSchema,
  affiliateCodeParamsSchema,
  affiliateCodeQuerySchema,
  affiliateCodeResultSchema,
} from '@opchub/shared/api-domains';
import { Public } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { ReferralCodeService } from '../services/referral-code.service';

@Public()
@Controller('public/affiliate')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class ReferralPublicController {
  constructor(private readonly referrals: ReferralCodeService) {}

  @Get('codes/:code')
  async code(
    @ZodParams(affiliateCodeParamsSchema) p: z.infer<typeof affiliateCodeParamsSchema>,
    @ZodQuery(affiliateCodeQuerySchema) q: z.infer<typeof affiliateCodeQuerySchema>,
  ) {
    return respond(affiliateCodeResultSchema, await this.referrals.check(p.code, q.email));
  }

  @Post('click')
  @HttpCode(204)
  async click(
    @ZodBody(affiliateClickSchema) body: z.infer<typeof affiliateClickSchema>,
    @Req() req: Request,
  ) {
    await this.referrals.click(body.code, req.ip ?? 'unknown');
  }
}
