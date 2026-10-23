import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type AdminService,
  adminServiceCommentSchema,
  adminServiceSchema,
  createAdminServiceCommentSchema,
  type CsvFile,
  csvFileSchema,
  pageQuerySchema,
  serviceRequestFilterSchema,
  serviceRequestSchema,
  servicePatchSchema,
  serviceUpsertSchema,
  staffMemberSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, ServiceAdminService } from '../services/service-admin.service';
import { ServiceCatalogService } from '../services/service-catalog.service';

type In<S extends z.ZodType> = z.output<S>;
const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuery = pageQuerySchema(10).extend(serviceRequestFilterSchema.shape);
const pageOut = pageSchema(serviceRequestSchema);
const staffList = z.object({ items: z.array(staffMemberSchema) });
const commentList = z.object({ items: z.array(adminServiceCommentSchema) });
const serviceList = z.object({ items: z.array(adminServiceSchema) });

/** Admin "Dịch vụ" (FEATURE_SERVICES) — phiếu + ghi chú nội bộ @nhắc + danh mục; D-72 bỏ trạng thái/phụ trách */
@Controller('admin')
export class AdminServiceRequestsController {
  constructor(
    private readonly admin: ServiceAdminService,
    private readonly catalog: ServiceCatalogService,
  ) {}

  /** Người gắn tên được trong ghi chú nội bộ (Q-V4-605-1) */
  @RequireAdmin('services.view')
  @Get('service-requests/staff')
  async staff(): Promise<In<typeof staffList>> {
    return respond(staffList, { items: await this.admin.staff() });
  }

  @RequireAdmin('services.action')
  @Post('service-requests/export')
  @HttpCode(200)
  async export(@CurrentUser() u: AccessClaims, @Req() req: Request): Promise<CsvFile> {
    return respond(csvFileSchema, await this.admin.exportCsv(actorOf(u, req)));
  }

  @RequireAdmin('services.view')
  @Get('service-requests')
  async list(@ZodQuery(listQuery) q: In<typeof listQuery>): Promise<In<typeof pageOut>> {
    return respond(pageOut, await this.admin.page(q));
  }

  @RequireAdmin('services.view')
  @Get('service-requests/:code/comments')
  async comments(@Param('code') code: string): Promise<In<typeof commentList>> {
    return respond(commentList, { items: await this.admin.comments(code) });
  }

  @RequireAdmin('services.action')
  @Post('service-requests/:code/comments')
  @HttpCode(201)
  async comment(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('code') code: string,
    @ZodBody(createAdminServiceCommentSchema, { rich: ['body'] })
    b: In<typeof createAdminServiceCommentSchema>,
  ): Promise<In<typeof adminServiceCommentSchema>> {
    const c = await this.admin.comment(actorOf(u, req), code, b.body, b.mentions);
    return respond(adminServiceCommentSchema, c);
  }

  @RequireAdmin('services.view')
  @Get('services')
  async services(): Promise<In<typeof serviceList>> {
    return respond(serviceList, { items: await this.catalog.list() });
  }

  @RequireAdmin('services.action')
  @Post('services')
  @HttpCode(201)
  async createService(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(serviceUpsertSchema) b: In<typeof serviceUpsertSchema>,
  ): Promise<AdminService> {
    return respond(adminServiceSchema, await this.catalog.create(actorOf(u, req), b));
  }

  @RequireAdmin('services.action')
  @Patch('services/:id')
  async patchService(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(servicePatchSchema) b: In<typeof servicePatchSchema>,
  ): Promise<AdminService> {
    return respond(adminServiceSchema, await this.catalog.update(actorOf(u, req), id, b));
  }

  @RequireAdmin('services.action')
  @Delete('services/:id')
  async deleteService(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.catalog.remove(actorOf(u, req), id);
  }
}
