import { Controller, Delete, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type Campaign,
  campaignCreateSchema,
  campaignEstimateQuerySchema,
  campaignEstimateSchema,
  campaignListSchema,
  campaignSchema,
  type MailJob,
  mailJobSchema,
  mailLogRowSchema,
  mailTemplateListSchema,
  type MarketingSummary,
  marketingSummarySchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, CampaignService } from '../services/campaign.service';
import { MailLogService } from '../services/mail-log.service';

type In<S extends z.ZodType> = z.output<S>;
const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const logQuerySchema = pageQuerySchema(20);
const logPageSchema = pageSchema(mailLogRowSchema);

/** Admin Marketing (`n.edit`, D-78/D-79, Q-G6b-1) */
@RequirePermission('n.edit')
@Controller('admin')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignService,
    private readonly logs: MailLogService,
  ) {}

  @Get('marketing/summary')
  async summary(): Promise<MarketingSummary> {
    return respond(marketingSummarySchema, await this.logs.summary());
  }

  @Get('campaigns/templates')
  templates(): In<typeof mailTemplateListSchema> {
    return respond(mailTemplateListSchema, { items: this.logs.templates() });
  }

  @Get('campaigns/estimate')
  async estimate(
    @ZodQuery(campaignEstimateQuerySchema) q: In<typeof campaignEstimateQuerySchema>,
  ): Promise<In<typeof campaignEstimateSchema>> {
    const recipients = await this.campaigns.estimate(q.audience, q.groupIds);
    return respond(campaignEstimateSchema, { recipients });
  }

  @Get('campaigns')
  async list(): Promise<In<typeof campaignListSchema>> {
    return respond(campaignListSchema, { items: await this.campaigns.list() });
  }

  /** Nháp / lên lịch → 201; gửi ngay → 202 (job qua outbox) */
  @Post('campaigns')
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @ZodBody(campaignCreateSchema, { rich: ['body'] }) body: In<typeof campaignCreateSchema>,
  ): Promise<Campaign> {
    const c = await this.campaigns.create(actorOf(user, req), body);
    res.status(c.status === 'sending' ? 202 : 201);
    return respond(campaignSchema, c);
  }

  @Post('campaigns/:id/send')
  @HttpCode(202)
  async send(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<MailJob> {
    return respond(mailJobSchema, await this.campaigns.send(actorOf(user, req), id));
  }

  @Delete('campaigns/:id')
  remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.campaigns.remove(actorOf(user, req), id);
  }

  @Get('mail/log')
  async log(
    @ZodQuery(logQuerySchema) q: In<typeof logQuerySchema>,
  ): Promise<In<typeof logPageSchema>> {
    return respond(logPageSchema, await this.logs.page(q.page, q.size));
  }

  @Post('mail/log/:id/resend')
  @HttpCode(202)
  async resend(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<MailJob> {
    return respond(mailJobSchema, await this.logs.resend(actorOf(user, req), id));
  }
}
