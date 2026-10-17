import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  FEE_ACTIONS,
  type FeeExport,
  feeBulkCollectResponseSchema,
  feeBulkCollectSchema,
  feeBulkRemindResponseSchema,
  feeBulkRemindSchema,
  feeExportResponseSchema,
  feeExportSchema,
  feeQuerySchema,
  type FeeRow,
  feeRowSchema,
  type FeeSummary,
  feeSummarySchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { notFound } from '@/common/errors';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { AdminFeesService, type FeeActor } from '../services/admin-fees.service';

const listQuery = pageQuerySchema(10).extend(feeQuerySchema.shape);
const feePageSchema = pageSchema(feeRowSchema);
const actionSchema = z.enum(FEE_ACTIONS);
const actorOf = (u: AccessClaims, req: Request): FeeActor => ({ id: u.sub, ip: req.ip ?? null });

/**
 * SRS §13 Membership (admin) + Q-G4b-1. Phí thuộc nhóm quyền "Thành viên": đọc `m.view`,
 * ghi `m.edit`. Route một đoạn (`collect`, `remind`…) khai báo TRƯỚC `:uid/:action`.
 */
@Controller('admin/fees')
export class AdminFeesController {
  constructor(private readonly fees: AdminFeesService) {}

  @RequirePermission('m.view')
  @Get()
  async list(@ZodQuery(listQuery) q: z.infer<typeof listQuery>) {
    return respond(feePageSchema, await this.fees.page(q.status, q.q, q.page, q.size));
  }

  @RequirePermission('m.view')
  @Get('summary')
  async summary(): Promise<FeeSummary> {
    return respond(feeSummarySchema, await this.fees.summary());
  }

  @RequirePermission('m.edit')
  @Post('collect')
  @HttpCode(200)
  async collect(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(feeBulkCollectSchema) body: z.infer<typeof feeBulkCollectSchema>,
  ): Promise<{ updated: number }> {
    const updated = await this.fees.collect(actorOf(user, req), body.userIds);
    return respond(feeBulkCollectResponseSchema, { updated });
  }

  @RequirePermission('m.edit')
  @Post('remind')
  @HttpCode(202)
  async remind(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(feeBulkRemindSchema) body: z.infer<typeof feeBulkRemindSchema>,
  ): Promise<{ queued: number }> {
    const queued = await this.fees.remind(actorOf(user, req), body.userIds);
    return respond(feeBulkRemindResponseSchema, { queued });
  }

  @RequirePermission('m.edit')
  @Post('remind-all')
  @HttpCode(202)
  async remindAll(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
  ): Promise<{ queued: number }> {
    const queued = await this.fees.remind(actorOf(user, req), 'all');
    return respond(feeBulkRemindResponseSchema, { queued });
  }

  @RequirePermission('m.view')
  @Post('export')
  @HttpCode(200)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(feeExportSchema) body: z.infer<typeof feeExportSchema>,
  ): Promise<FeeExport> {
    return respond(
      feeExportResponseSchema,
      await this.fees.export(actorOf(user, req), body.userIds),
    );
  }

  @RequirePermission('m.edit')
  @Post(':uid/:action')
  @HttpCode(200)
  async rowAction(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('uid') uid: string,
    @Param('action') action: string,
  ): Promise<FeeRow> {
    const a = actionSchema.safeParse(action);
    if (!a.success) throw notFound();
    return respond(feeRowSchema, await this.fees.action(actorOf(user, req), uid, a.data));
  }
}
