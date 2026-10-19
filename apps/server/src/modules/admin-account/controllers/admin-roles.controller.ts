import { Controller, Get, HttpCode, Param, Patch, Post, Put, Req } from '@nestjs/common';
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
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { actorOf } from '../services/admin-actor';
import { AdminRolesService } from '../services/admin-roles.service';

/**
 * Tab "Vai trò & phân quyền" (RB-R04, RB-R05, NA-28). Guard tạm `s.role` — TIP-V2-203 đổi sang
 * `settings.admins`. `permissions` khai báo trước `:id` để không bị bắt như id.
 */
@Controller('admin/admin-roles')
export class AdminRolesController {
  constructor(private readonly roles: AdminRolesService) {}

  @RequirePermission('s.role')
  @Get()
  async list(): Promise<AdminRoleList> {
    return respond(adminRoleListSchema, await this.roles.list());
  }

  @RequirePermission('s.role')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminRoleCreateSchema) body: z.output<typeof adminRoleCreateSchema>,
  ): Promise<AdminRoleRow> {
    return respond(adminRoleSchema, await this.roles.create(actorOf(user, req), body));
  }

  @RequirePermission('s.role')
  @Put('permissions')
  async putMatrix(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminRoleMatrixSchema) body: AdminRoleMatrix,
  ): Promise<AdminRoleList> {
    return respond(adminRoleListSchema, await this.roles.putMatrix(actorOf(user, req), body));
  }

  @RequirePermission('s.role')
  @Patch(':id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminRolePatchSchema) body: AdminRolePatch,
  ): Promise<AdminRoleRow> {
    return respond(adminRoleSchema, await this.roles.update(actorOf(user, req), id, body));
  }
}
