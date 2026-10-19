import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req } from '@nestjs/common';
import {
  type AdminRoleList,
  adminRoleCreateSchema,
  adminRoleListSchema,
  type AdminRoleMatrix,
  adminRoleMatrixSchema,
  type AdminRolePatch,
  adminRolePatchSchema,
  type AdminRoleRow,
  adminRoleSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { actorOf } from '../services/admin-actor';
import { AdminRolesService } from '../services/admin-roles.service';

/**
 * Tab "Vai trò & phân quyền" (RB-R04, RB-R05, NA-28) — `settings.admins`. `permissions` khai báo trước `:id` để không bị bắt như id.
 */
@Controller('admin/admin-roles')
export class AdminRolesController {
  constructor(private readonly roles: AdminRolesService) {}

  @RequireAdmin('settings.admins')
  @Get()
  async list(): Promise<AdminRoleList> {
    return respond(adminRoleListSchema, await this.roles.list());
  }

  @RequireAdmin('settings.admins')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminRoleCreateSchema) body: z.output<typeof adminRoleCreateSchema>,
  ): Promise<AdminRoleRow> {
    return respond(adminRoleSchema, await this.roles.create(actorOf(user, req), body));
  }

  @RequireAdmin('settings.admins')
  @Put('permissions')
  async putMatrix(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminRoleMatrixSchema) body: AdminRoleMatrix,
  ): Promise<AdminRoleList> {
    return respond(adminRoleListSchema, await this.roles.putMatrix(actorOf(user, req), body));
  }

  @RequireAdmin('settings.admins')
  @Patch(':id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminRolePatchSchema) body: AdminRolePatch,
  ): Promise<AdminRoleRow> {
    return respond(adminRoleSchema, await this.roles.update(actorOf(user, req), id, body));
  }

  @RequireAdmin('settings.admins')
  @Delete(':id')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.roles.remove(actorOf(user, req), id);
  }
}
