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
  type ServiceRequest,
  serviceRequestFilterSchema,
  serviceRequestSchema,
  type ServiceRequestSummary,
  serviceRequestSummarySchema,
  servicePatchSchema,
  serviceTransitionSchema,
  serviceUpsertSchema,
  staffMemberSchema,
  updateServiceRequestSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, ServiceAdminService } from '../services/service-admin.service';
import { ServiceCatalogService } from '../services/service-catalog.service';
import { ServiceRequestPatchService } from '../services/service-request-patch.service';

type In<S extends z.ZodType> = z.output<S>;
const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuery = pageQuerySchema(10).extend(serviceRequestFilterSchema.shape);
const pageOut = pageSchema(serviceRequestSchema);
const staffList = z.object({ items: z.array(staffMemberSchema) });
const commentList = z.object({ items: z.array(adminServiceCommentSchema) });
const serviceList = z.object({ items: z.array(adminServiceSchema) });
const assignSchema = z.object({ assignee: z.string().trim().max(100).nullable() });

/** Admin "Dịch vụ" (FEATURE_SERVICES, `n.edit`) — SRS §13 Services + Q-G5c-2 */
@RequirePermission('n.edit')
@Controller('admin')
export class AdminServiceRequestsController {
  constructor(
    private readonly admin: ServiceAdminService,
    private readonly catalog: ServiceCatalogService,
    private readonly patcher: ServiceRequestPatchService,
  ) {}

  @Get('service-requests/summary')
  async summary(): Promise<ServiceRequestSummary> {
    return respond(serviceRequestSummarySchema, await this.admin.summary());
  }

  @Get('service-requests/staff')
  async staff(): Promise<In<typeof staffList>> {
    return respond(staffList, { items: await this.admin.staff() });
  }

  @Post('service-requests/export')
  @HttpCode(200)
  async export(@CurrentUser() u: AccessClaims, @Req() req: Request): Promise<CsvFile> {
    return respond(csvFileSchema, await this.admin.exportCsv(actorOf(u, req)));
  }

  @Get('service-requests')
  async list(@ZodQuery(listQuery) q: In<typeof listQuery>): Promise<In<typeof pageOut>> {
    return respond(pageOut, await this.admin.page(q));
  }

  @Post('service-requests/:code/transition')
  @HttpCode(200)
  async transition(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('code') code: string,
    @ZodBody(serviceTransitionSchema) b: In<typeof serviceTransitionSchema>,
  ): Promise<ServiceRequest> {
    const r = await this.admin.transition(actorOf(u, req), code, b.from, b.to);
    return respond(serviceRequestSchema, r);
  }

  /** SRS §13: đổi trạng thái (từ trạng thái hiện tại) và/hoặc người phụ trách */
  @Patch('service-requests/:code')
  async patch(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('code') code: string,
    @ZodBody(updateServiceRequestSchema) b: In<typeof updateServiceRequestSchema>,
  ): Promise<ServiceRequest> {
    const r = await this.patcher.patch(actorOf(u, req), code, b);
    return respond(serviceRequestSchema, r);
  }

  @Patch('service-requests/:code/assignee')
  async assign(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('code') code: string,
    @ZodBody(assignSchema) b: In<typeof assignSchema>,
  ): Promise<ServiceRequest> {
    const r = await this.admin.assign(actorOf(u, req), code, b.assignee);
    return respond(serviceRequestSchema, r);
  }

  @Get('service-requests/:code/comments')
  async comments(@Param('code') code: string): Promise<In<typeof commentList>> {
    return respond(commentList, { items: await this.admin.comments(code) });
  }

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

  @Get('services')
  async services(): Promise<In<typeof serviceList>> {
    return respond(serviceList, { items: await this.catalog.list() });
  }

  @Post('services')
  @HttpCode(201)
  async createService(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(serviceUpsertSchema) b: In<typeof serviceUpsertSchema>,
  ): Promise<AdminService> {
    return respond(adminServiceSchema, await this.catalog.create(actorOf(u, req), b));
  }

  @Patch('services/:id')
  async patchService(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(servicePatchSchema) b: In<typeof servicePatchSchema>,
  ): Promise<AdminService> {
    return respond(adminServiceSchema, await this.catalog.update(actorOf(u, req), id, b));
  }

  @Delete('services/:id')
  async deleteService(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.catalog.remove(actorOf(u, req), id);
  }
}
