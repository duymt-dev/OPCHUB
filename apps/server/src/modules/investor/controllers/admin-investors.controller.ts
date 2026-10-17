import { Controller, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type AdminInvestor,
  adminInvestorFilterSchema,
  adminInvestorSchema,
  type AdminInvestorSummary,
  adminInvestorSummarySchema,
  createInvestorCommentSchema,
  type CsvFile,
  csvFileSchema,
  type InvestorComment,
  investorCommentSchema,
  investorStatusPatchSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, InvestorAdminService } from '../services/investor-admin.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuerySchema = pageQuerySchema(10).extend(adminInvestorFilterSchema.shape);
const adminPageSchema = pageSchema(adminInvestorSchema);
const commentListSchema = z.object({ items: z.array(investorCommentSchema) });
type In<S extends z.ZodType> = z.infer<S>;

/** Admin "Nhà đầu tư" (G5c) — mọi route `p.pub` */
@RequirePermission('p.pub')
@Controller('admin/investors')
export class AdminInvestorsController {
  constructor(private readonly admin: InvestorAdminService) {}

  @Get()
  async list(
    @ZodQuery(listQuerySchema) q: In<typeof listQuerySchema>,
  ): Promise<In<typeof adminPageSchema>> {
    return respond(adminPageSchema, await this.admin.page(q));
  }

  @Get('summary')
  async summary(): Promise<AdminInvestorSummary> {
    return respond(adminInvestorSummarySchema, await this.admin.summary());
  }

  @Post('export')
  @HttpCode(200)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminInvestorFilterSchema) body: In<typeof adminInvestorFilterSchema>,
  ): Promise<CsvFile> {
    return respond(csvFileSchema, await this.admin.export(actorOf(user, req), body));
  }

  @Get(':key')
  async detail(@Param('key') key: string): Promise<AdminInvestor> {
    return respond(adminInvestorSchema, await this.admin.detail(key));
  }

  @Patch(':key/status')
  async status(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('key') key: string,
    @ZodBody(investorStatusPatchSchema) body: In<typeof investorStatusPatchSchema>,
  ): Promise<AdminInvestor> {
    return respond(
      adminInvestorSchema,
      await this.admin.setStatus(actorOf(user, req), key, body.status),
    );
  }

  @Get(':key/comments')
  async comments(@Param('key') key: string): Promise<In<typeof commentListSchema>> {
    return respond(commentListSchema, await this.admin.comments(key));
  }

  @Post(':key/comments')
  @HttpCode(201)
  async comment(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('key') key: string,
    @ZodBody(createInvestorCommentSchema) body: In<typeof createInvestorCommentSchema>,
  ): Promise<InvestorComment> {
    return respond(
      investorCommentSchema,
      await this.admin.comment(actorOf(user, req), key, body.body),
    );
  }
}
