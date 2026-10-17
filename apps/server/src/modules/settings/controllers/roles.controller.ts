import { Controller, Delete, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import {
  type AdminAccount,
  adminAccountSchema,
  type AdminInvite,
  adminInviteSchema,
  auditLogRowSchema,
  type RolePermissions,
  rolePermissionsSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { AdminAccountsService } from '../services/admin-accounts.service';
import { AuditLogService } from '../services/audit-log.service';
import { RolePermissionsService } from '../services/role-permissions.service';
import { actorOf } from './settings.controller';

const accountListSchema = z.object({ items: z.array(adminAccountSchema) });
const auditListSchema = z.object({ items: z.array(auditLogRowSchema) });

/** Phân quyền vai trò + tài khoản quản trị (`s.role`, D-42/D-46) + nhật ký (`s.log`) */
@Controller('admin')
export class RolesController {
  constructor(
    private readonly roles: RolePermissionsService,
    private readonly admins: AdminAccountsService,
    private readonly audit: AuditLogService,
  ) {}

  @RequirePermission('s.role')
  @Get('roles/permissions')
  async permissions(): Promise<RolePermissions> {
    return respond(rolePermissionsSchema, await this.roles.get());
  }

  @RequirePermission('s.role')
  @Put('roles/permissions')
  async putPermissions(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(rolePermissionsSchema) body: RolePermissions,
  ): Promise<RolePermissions> {
    return respond(rolePermissionsSchema, await this.roles.put(actorOf(user, req), body));
  }

  @RequirePermission('s.role')
  @Get('admins')
  async listAdmins(): Promise<z.infer<typeof accountListSchema>> {
    return respond(accountListSchema, await this.admins.list());
  }

  @RequirePermission('s.role')
  @Post('admins/invite')
  @HttpCode(201)
  async invite(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminInviteSchema) body: AdminInvite,
  ): Promise<AdminAccount> {
    return respond(adminAccountSchema, await this.admins.invite(actorOf(user, req), body));
  }

  @RequirePermission('s.role')
  @Delete('admins/:id')
  async revoke(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.admins.revoke(actorOf(user, req), id);
  }

  @RequirePermission('s.log')
  @Get('audit-logs')
  async auditLogs(): Promise<z.infer<typeof auditListSchema>> {
    return respond(auditListSchema, await this.audit.recent());
  }
}
