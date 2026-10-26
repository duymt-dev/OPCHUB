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
  userExportSchema,
  type UserStatusUpdate,
  userStatusUpdateSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { AuditService } from '@/common/audit';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { conflict } from '@/common/errors';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportService } from '@/modules/export';
import { type Actor, AdminUsersService } from '../services/admin-users.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
type MemberQuery = z.infer<typeof adminMemberQuerySchema>;

/** SRS §13 Users (admin) + Q-G4a-1. Đọc `members.view`, ghi `members.action`; vai trò quản trị chỉ ở TK quản trị (RB-R01) */
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly exports: ExportService,
  ) {}

  @RequireAdmin('members.view')
  @Get()
  async list(@ZodQuery(adminMemberQuerySchema) q: MemberQuery): Promise<AdminMemberPage> {
    return respond(
      adminMemberPageSchema,
      await this.users.page(q.type, q.q, q.page, q.size, q.onboarding),
    );
  }

  @RequireAdmin('members.action')
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
      new Date(),
      body.days,
    );
    if (!changed.length) throw conflict('Tài khoản đã ở trạng thái này');
    return { id, status: body.status };
  }

  @RequireAdmin('members.action')
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
      new Date(),
      body.days,
    );
    return respond(bulkStatusResultSchema, { updated: changed.length });
  }

  @RequireAdmin('members.action')
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

  @RequireAdmin('members.action')
  @Post('assign-groups')
  @HttpCode(200)
  async assign(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(assignGroupsSchema) body: AssignGroupsRequest,
  ): Promise<{ updated: number }> {
    const updated = await this.users.assignGroups(
      actorOf(user, req),
      body.userIds,
      body.groupIds,
      body.role,
    );
    return respond(assignGroupsResponseSchema, { updated });
  }

  /** Job xuất CSV (B43): export_jobs + outbox + audit cùng transaction (luật 10) */
  @RequireAdmin('members.action')
  @Post('export')
  @HttpCode(202)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(userExportSchema) body: z.infer<typeof userExportSchema>,
  ): Promise<{ jobId: string; status: 'queued' }> {
    const jobId = await this.prisma.db.$transaction(async (tx) => {
      const id = await this.exports.request(tx, user.sub, {
        kind: 'users',
        ...(body.userIds ? { userIds: body.userIds } : {}),
      });
      await this.audit.log(tx, {
        actorId: user.sub,
        action: 'export.users',
        entity: 'export',
        entityId: id,
        tag: 'member',
        summary: `xuất danh sách thành viên (${body.userIds?.length ?? 'tất cả'})`,
        ip: req.ip ?? null,
      });
      return id;
    });
    return respond(exportJobSchema, { jobId, status: 'queued' });
  }
}
