import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import {
  type CreateInterestPortal,
  type InvestorInterest,
  investorInterestSchema,
  investorThreadSchema,
  type InvestorThreadMessage,
  sendThreadMessageSchema,
  threadMessageSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, AllowAccountTypes, CurrentUser } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { InterestService } from '../services/interest.service';

const interestListSchema = z.object({ items: z.array(investorInterestSchema) });
const threadListSchema = z.object({ items: z.array(investorThreadSchema) });

/** Quan tâm đầu tư + trao đổi (D-14: Nhà đầu tư vào được các route này không cần phí) */
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

  @Get('me/investor-thread')
  async threads(@CurrentUser() user: AccessClaims): Promise<z.infer<typeof threadListSchema>> {
    return respond(threadListSchema, await this.interests.threads(user.sub));
  }

  @Post('investor-thread/:key/messages')
  @HttpCode(201)
  async send(
    @CurrentUser() user: AccessClaims,
    @Param('key') key: string,
    @ZodBody(sendThreadMessageSchema) body: z.infer<typeof sendThreadMessageSchema>,
  ): Promise<InvestorThreadMessage> {
    return respond(threadMessageSchema, await this.interests.send(user.sub, key, body.body));
  }
}
