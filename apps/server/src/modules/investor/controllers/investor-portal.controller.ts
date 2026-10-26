import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import {
  type CreateInterestPortal,
  type InvestorInterest,
  investorInterestSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, AllowAccountTypes, CurrentUser } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { InterestService } from '../services/interest.service';

const interestListSchema = z.object({ items: z.array(investorInterestSchema) });

/** Quan tâm đầu tư (D-14: Nhà đầu tư vào được các route này không cần phí; D-72 bỏ trao đổi) */
@AllowAccountTypes('investor')
@Controller()
export class InvestorPortalController {
  constructor(private readonly interests: InterestService) {}

  /**
   * Thân request parse trong service SAU khi kiểm header (thứ tự lỗi như hợp đồng MSW:
   * thiếu Idempotency-Key → 400 trước khi kiểm dữ liệu).
   */
  @Post('projects/:id/interest')
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: CreateInterestPortal,
  ): Promise<InvestorInterest> {
    return respond(investorInterestSchema, await this.interests.create(user.sub, id, key, body));
  }

  @Get('projects/:id/interests')
  async ofProject(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<z.infer<typeof interestListSchema>> {
    return respond(interestListSchema, await this.interests.ofProject(user.sub, id));
  }
}
