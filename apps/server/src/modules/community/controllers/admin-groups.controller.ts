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
  pageQuerySchema,
  adminRoomSchema,
  type AdminRoom,
  type RoomRename,
  roomRenameSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { GroupService } from '../services/group.service';
import { type Actor, GroupAdminService } from '../services/group-admin.service';
import { GroupTopicsService } from '../services/group-topics.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuerySchema = pageQuerySchema(10);
const adminPageSchema = pageSchema(groupItemSchema);
const countsSchema = z.record(z.string(), z.number().int());
const exportResultSchema = exportJobSchema.extend({ rows: z.number().int() });
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
    private readonly topics: GroupTopicsService,
  ) {}

  @RequireAdmin('groups.view')
  @Get()
  async list(
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof adminPageSchema>> {
    return respond(adminPageSchema, await this.groups.page(null, q));
  }

  @RequireAdmin('groups.view')
  @Get('member-counts')
  async memberCounts(): Promise<Record<string, number>> {
    return respond(countsSchema, await this.admin.memberCounts());
  }

  @RequireAdmin('groups.view')
  @Get('members')
  async members(
    @ZodQuery(groupMembersQuerySchema) q: z.infer<typeof groupMembersQuerySchema>,
  ): Promise<z.infer<typeof groupMemberListSchema>> {
    return respond(groupMemberListSchema, {
      items: await this.admin.members(q.groupIds, q.status),
    });
  }

  @RequireAdmin('groups.action')
  @Post('members/export')
  @HttpCode(202)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(groupMembersExportSchema) body: GroupMembersExport,
  ): Promise<z.infer<typeof exportResultSchema>> {
    return respond(exportResultSchema, await this.admin.export(actorOf(user, req), body));
  }

  @RequireAdmin('groups.action')
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

  @RequireAdmin('groups.view')
  @Get(':id')
  async detail(@Param('id') id: string): Promise<GroupDetail> {
    return respond(groupDetailSchema, await this.admin.detail(id));
  }

  @RequireAdmin('groups.action')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(groupAdminUpsertSchema) body: GroupAdminUpsert,
  ): Promise<GroupDetail> {
    return respond(groupDetailSchema, await this.admin.create(actorOf(user, req), body));
  }

  @RequireAdmin('groups.action')
  @Patch(':id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(groupAdminUpsertSchema) body: GroupAdminUpsert,
  ): Promise<GroupDetail> {
    return respond(groupDetailSchema, await this.admin.update(actorOf(user, req), id, body));
  }

  /** D-111 đổi tên / mô tả chủ đề ("Chung" chỉ đổi mô tả) */
  @RequireAdmin('groups.action')
  @Patch(':id/rooms/:roomId')
  async renameRoom(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @ZodBody(roomRenameSchema) body: RoomRename,
  ): Promise<AdminRoom> {
    return respond(adminRoomSchema, await this.topics.rename(actorOf(user, req), id, roomId, body));
  }

  /** D-111 xoá mềm chủ đề ("Chung" → 409; tin giữ, ẩn khỏi Portal) */
  @RequireAdmin('groups.action')
  @Delete(':id/rooms/:roomId')
  async removeRoom(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @Param('roomId') roomId: string,
  ): Promise<{ id: string }> {
    return this.topics.remove(actorOf(user, req), id, roomId);
  }

  @RequireAdmin('groups.action')
  @Delete(':id')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.admin.remove(actorOf(user, req), id);
  }
}
