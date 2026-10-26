import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type AdminInvestor,
  adminInvestorFilterSchema,
  adminInvestorSchema,
  type AdminInvestorSummary,
  adminInvestorSummarySchema,
  type CsvFile,
  csvFileSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, InvestorAdminService } from '../services/investor-admin.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuerySchema = pageQuerySchema(10).extend(adminInvestorFilterSchema.shape);
const adminPageSchema = pageSchema(adminInvestorSchema);
type In<S extends z.ZodType> = z.infer<S>;

/** Admin "Nhà đầu tư" (G5c, AD-08b) — danh sách + xuất; D-72 bỏ trạng thái và trao đổi */
@Controller('admin/investors')
export class AdminInvestorsController {
  constructor(private readonly admin: InvestorAdminService) {}

  @RequireAdmin('investors.view')
  @Get()
  async list(
    @ZodQuery(listQuerySchema) q: In<typeof listQuerySchema>,
  ): Promise<In<typeof adminPageSchema>> {
    return respond(adminPageSchema, await this.admin.page(q));
  }

  @RequireAdmin('investors.view')
  @Get('summary')
  async summary(): Promise<AdminInvestorSummary> {
    return respond(adminInvestorSummarySchema, await this.admin.summary());
  }

  @RequireAdmin('investors.action')
  @Post('export')
  @HttpCode(200)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminInvestorFilterSchema) body: In<typeof adminInvestorFilterSchema>,
  ): Promise<CsvFile> {
    return respond(csvFileSchema, await this.admin.export(actorOf(user, req), body));
  }

  @RequireAdmin('investors.view')
  @Get(':key')
  async detail(@Param('key') key: string): Promise<AdminInvestor> {
    return respond(adminInvestorSchema, await this.admin.detail(key));
  }
}
