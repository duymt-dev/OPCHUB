import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  exportJobSchema,
  GROUP_EXPORT_FIELDS,
  type GroupAdminUpsert,
  groupAdminUpsertSchema,
  type GroupDetail,
  groupDetailSchema,
  groupItemSchema,
  groupMemberListSchema,
  type GroupMembersExport,
  groupMembersExportSchema,
  groupMembersQuerySchema,
  joinRequestSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { GroupService } from '../services/group.service';
import { JoinRequestService } from '../services/join-request.service';
import { type Actor, GroupAdminService } from '../services/group-admin.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuerySchema = pageQuerySchema(10);
const adminPageSchema = pageSchema(groupItemSchema);
const countsSchema = z.record(z.string(), z.number().int());
const exportResultSchema = exportJobSchema.extend({ rows: z.number().int() });
const requestListSchema = z.object({ items: z.array(joinRequestSchema) });
/** Xuất một nhóm (SRS §13): thân tuỳ chọn, mặc định mọi cột + mọi trạng thái */
const oneGroupExportSchema = groupMembersExportSchema
  .omit({ groupIds: true })
  .partial()
  .default({});

/** Admin "Nhóm cộng đồng". Đọc `m.view`, ghi `c.create` (Q-B20-3) */
@Controller('admin/groups')
export class AdminGroupsController {
  constructor(
    private readonly groups: GroupService,
    private readonly admin: GroupAdminService,
    private readonly requests: JoinRequestService,
  ) {}

  @RequirePermission('c.room')
  @Get('requests')
  async pendingRequests(): Promise<z.infer<typeof requestListSchema>> {
    return respond(requestListSchema, { items: await this.requests.listAll() });
  }

  @RequirePermission('m.view')
  @Get()
  async list(
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof adminPageSchema>> {
    return respond(adminPageSchema, await this.groups.page(null, q));
  }

  @RequirePermission('m.view')
  @Get('member-counts')
  async memberCounts(): Promise<Record<string, number>> {
    return respond(countsSchema, await this.admin.memberCounts());
  }

  @RequirePermission('m.view')
  @Get('members')
  async members(
    @ZodQuery(groupMembersQuerySchema) q: z.infer<typeof groupMembersQuerySchema>,
  ): Promise<z.infer<typeof groupMemberListSchema>> {
    return respond(groupMemberListSchema, {
      items: await this.admin.members(q.groupIds, q.status),
    });
  }

  @RequirePermission('m.view')
  @Post('members/export')
  @HttpCode(202)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(groupMembersExportSchema) body: GroupMembersExport,
  ): Promise<z.infer<typeof exportResultSchema>> {
    return respond(exportResultSchema, await this.admin.export(actorOf(user, req), body));
  }

  @RequirePermission('c.room')
  @Post(':id/members/export')
  @HttpCode(202)
  async exportOne(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(oneGroupExportSchema) body: z.infer<typeof oneGroupExportSchema>,
  ): Promise<z.infer<typeof exportResultSchema>> {
    const job = await this.admin.export(actorOf(user, req), {
      groupIds: [id],
      fields: body.fields ?? [...GROUP_EXPORT_FIELDS],
      status: body.status ?? 'all',
      format: body.format ?? 'csv',
    });
    return respond(exportResultSchema, job);
  }

  @RequirePermission('m.view')
  @Get(':id')
  async detail(@Param('id') id: string): Promise<GroupDetail> {
    return respond(groupDetailSchema, await this.admin.detail(id));
  }

  @RequirePermission('c.create')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(groupAdminUpsertSchema) body: GroupAdminUpsert,
  ): Promise<GroupDetail> {
    return respond(groupDetailSchema, await this.admin.create(actorOf(user, req), body));
  }

  @RequirePermission('c.create')
  @Patch(':id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(groupAdminUpsertSchema) body: GroupAdminUpsert,
  ): Promise<GroupDetail> {
    return respond(groupDetailSchema, await this.admin.update(actorOf(user, req), id, body));
  }

  @RequirePermission('c.create')
  @Delete(':id')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.admin.remove(actorOf(user, req), id);
  }
}
