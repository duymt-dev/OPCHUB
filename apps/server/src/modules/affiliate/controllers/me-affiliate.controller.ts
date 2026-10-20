import { Controller, Get, Put } from '@nestjs/common';
import type { z } from 'zod';
import {
  affiliateBankSchema,
  affiliatePageQuerySchema,
  affiliatePayoutsSchema,
  affiliateReferralsSchema,
  myAffiliateSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { MeAffiliateService } from '../services/me-affiliate.service';

@Controller('me/affiliate')
@SkipMembershipFee()
export class MeAffiliateController {
  constructor(private readonly affiliates: MeAffiliateService) {}

  @Get()
  async mine(@CurrentUser() user: AccessClaims) {
    return respond(myAffiliateSchema, await this.affiliates.mine(user.sub));
  }
  @Get('referrals')
  async referrals(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(affiliatePageQuerySchema) q: z.infer<typeof affiliatePageQuerySchema>,
  ) {
    return respond(affiliateReferralsSchema, await this.affiliates.referrals(user.sub, q));
  }
  @Get('payouts')
  async payouts(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(affiliatePageQuerySchema) q: z.infer<typeof affiliatePageQuerySchema>,
  ) {
    return respond(affiliatePayoutsSchema, await this.affiliates.payouts(user.sub, q));
  }
  @Put('bank')
  async bank(
    @CurrentUser() user: AccessClaims,
    @ZodBody(affiliateBankSchema) bank: z.infer<typeof affiliateBankSchema>,
  ) {
    return respond(affiliateBankSchema, await this.affiliates.bank(user.sub, bank));
  }
}
