import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import {
  type AdminAccountCreateParsed,
  adminAccountCreateSchema,
  type AdminAccountList,
  adminAccountListSchema,
  type AdminAccountRoleRequest,
  adminAccountRoleSchema,
  type AdminAccountRow,
  adminAccountRowSchema,
  type AdminAccountStatusRequest,
  adminAccountStatusSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { actorOf } from '../services/admin-actor';
import { AdminAccountsService } from '../services/admin-accounts.service';
import { AdminSecurityService } from '../services/admin-security.service';

/**
 * Tab "Tài khoản quản trị" (RB-R02, D-52). Guard tạm `s.role` (chỉ Super Admin) — TIP-V2-203
 * đổi sang `settings.admins`.
 */
@Controller('admin/admin-accounts')
export class AdminAccountsController {
  constructor(
    private readonly accounts: AdminAccountsService,
    private readonly security: AdminSecurityService,
  ) {}

  @RequireAdmin('settings.admins')
  @Get()
  async list(): Promise<AdminAccountList> {
    return respond(adminAccountListSchema, await this.accounts.list());
  }

  @RequireAdmin('settings.admins')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminAccountCreateSchema) body: AdminAccountCreateParsed,
  ): Promise<AdminAccountRow> {
    return respond(adminAccountRowSchema, await this.accounts.create(actorOf(user, req), body));
  }

  /** RB-R08: khoá / mở khoá */
  @RequireAdmin('settings.admins')
  @Post(':id/status')
  @HttpCode(200)
  async status(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminAccountStatusSchema) body: AdminAccountStatusRequest,
  ): Promise<AdminAccountRow> {
    const row = await this.security.setStatus(actorOf(user, req), id, body.status, body.reason);
    return respond(adminAccountRowSchema, row);
  }

  /** RB-R04: đổi vai trò */
  @RequireAdmin('settings.admins')
  @Patch(':id/role')
  async role(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminAccountRoleSchema) body: AdminAccountRoleRequest,
  ): Promise<AdminAccountRow> {
    const row = await this.security.setRole(actorOf(user, req), id, body.roleId);
    return respond(adminAccountRowSchema, row);
  }

  /** Thu hồi quyền quản trị (xoá mềm) */
  @RequireAdmin('settings.admins')
  @Delete(':id')
  async revoke(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return respond(
      z.object({ id: z.string() }),
      await this.security.revoke(actorOf(user, req), id),
    );
  }
}
