import { Controller, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import {
  type AdminMember,
  type AdminMemberPage,
  adminMemberPageSchema,
  adminMemberQuerySchema,
  adminMemberSchema,
  assignGroupsResponseSchema,
  type AssignGroupsRequest,
  assignGroupsSchema,
  type BizVerificationDecision,
  bizVerificationDecisionSchema,
  type BulkStatusRequest,
  bulkStatusResultSchema,
  bulkStatusSchema,
  exportJobSchema,
  type MemberRoleUpdate,
  memberRoleUpdateSchema,
  userExportSchema,
  type UserStatusUpdate,
  userStatusUpdateSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuditService } from '@/common/audit';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { conflict } from '@/common/errors';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type Actor, AdminUsersService } from '../services/admin-users.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
type MemberQuery = z.infer<typeof adminMemberQuerySchema>;

/** SRS §13 Users (admin) + Q-G4a-1. Đọc `m.view`, ghi `m.edit`, đổi vai trò `s.role` (D-42) */
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @RequirePermission('m.view')
  @Get()
  async list(@ZodQuery(adminMemberQuerySchema) q: MemberQuery): Promise<AdminMemberPage> {
    return respond(adminMemberPageSchema, await this.users.page(q.type, q.q, q.page, q.size));
  }

  @RequirePermission('m.edit')
  @Patch(':id/status')
  async status(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(userStatusUpdateSchema) body: UserStatusUpdate,
  ): Promise<{ id: string; status: string }> {
    const changed = await this.users.setStatus(
      actorOf(user, req),
      [id],
      body.status,
      body.reason ?? null,
    );
    if (!changed.length) throw conflict('Tài khoản đã ở trạng thái này');
    return { id, status: body.status };
  }

  @RequirePermission('m.edit')
  @Post('status')
  @HttpCode(200)
  async bulkStatus(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(bulkStatusSchema) body: BulkStatusRequest,
  ): Promise<{ updated: number }> {
    const changed = await this.users.setStatus(
      actorOf(user, req),
      body.userIds,
      body.status,
      body.reason ?? null,
    );
    return respond(bulkStatusResultSchema, { updated: changed.length });
  }

  @RequirePermission('s.role')
  @Patch(':id/role')
  async role(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(memberRoleUpdateSchema) body: MemberRoleUpdate,
  ): Promise<AdminMember> {
    return respond(adminMemberSchema, await this.users.setRole(actorOf(user, req), id, body.role));
  }

  @RequirePermission('m.edit')
  @Post(':id/verification')
  @HttpCode(200)
  async verification(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(bizVerificationDecisionSchema) body: BizVerificationDecision,
  ): Promise<AdminMember> {
    const m = await this.users.decideVerification(
      actorOf(user, req),
      id,
      body.decision,
      body.reason,
    );
    return respond(adminMemberSchema, m);
  }

  @RequirePermission('m.edit')
  @Post('assign-groups')
  @HttpCode(200)
  async assign(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(assignGroupsSchema) body: AssignGroupsRequest,
  ): Promise<{ updated: number }> {
    const updated = await this.users.assignGroups(actorOf(user, req), body.userIds, body.groupIds);
    return respond(assignGroupsResponseSchema, { updated });
  }

  /** Job xuất thật ở B43; tới lúc đó chỉ ghi audit (luật 10: xuất dữ liệu cá nhân) */
  @RequirePermission('m.view')
  @Post('export')
  @HttpCode(202)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(userExportSchema) body: z.infer<typeof userExportSchema>,
  ): Promise<{ jobId: string; status: 'queued' }> {
    const jobId = randomUUID();
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: user.sub,
        action: 'export.users',
        entity: 'export',
        entityId: jobId,
        tag: 'member',
        summary: `Xuất danh sách thành viên (${body.userIds?.length ?? 'tất cả'})`,
        ip: req.ip ?? null,
      }),
    );
    return respond(exportJobSchema, { jobId, status: 'queued' });
  }
}
