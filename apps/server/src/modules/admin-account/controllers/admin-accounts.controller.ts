import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  type AdminAccountCreateParsed,
  adminAccountCreateSchema,
  type AdminAccountList,
  adminAccountListSchema,
  type AdminAccountRow,
  adminAccountRowSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { actorOf } from '../services/admin-actor';
import { AdminAccountsService } from '../services/admin-accounts.service';

/**
 * Tab "Tài khoản quản trị" (RB-R02, D-52). Guard tạm `s.role` (chỉ Super Admin) — TIP-V2-203
 * đổi sang `settings.admins`.
 */
@Controller('admin/admin-accounts')
export class AdminAccountsController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @RequirePermission('s.role')
  @Get()
  async list(): Promise<AdminAccountList> {
    return respond(adminAccountListSchema, await this.accounts.list());
  }

  @RequirePermission('s.role')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminAccountCreateSchema) body: AdminAccountCreateParsed,
  ): Promise<AdminAccountRow> {
    return respond(adminAccountRowSchema, await this.accounts.create(actorOf(user, req), body));
  }
}
