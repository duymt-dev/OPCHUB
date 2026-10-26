import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import {
  type AdminNeedList,
  adminNeedListSchema,
  adminNeedModerateSchema,
  adminNeedQuerySchema,
  adminStoreModerateResultSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { NeedAdminService } from '../services/need-admin.service';

type Moderate = z.infer<typeof adminNeedModerateSchema>;
type Result = z.infer<typeof adminStoreModerateResultSchema>;

/** AD-07 Admin › Nhu cầu: menu `stores` (Gian hàng & Nhu cầu) — `stores.view` xem, `stores.action` ẩn / hiện */
@Controller('admin/needs')
export class AdminNeedController {
  constructor(private readonly admin: NeedAdminService) {}

  @RequireAdmin('stores.view')
  @Get()
  async list(
    @ZodQuery(adminNeedQuerySchema) q: z.infer<typeof adminNeedQuerySchema>,
  ): Promise<AdminNeedList> {
    return respond(adminNeedListSchema, await this.admin.list(q.status, q.q, q.page));
  }

  @RequireAdmin('stores.action')
  @Post('hide')
  @HttpCode(200)
  async hide(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminNeedModerateSchema) body: Moderate,
  ): Promise<Result> {
    const actor = { id: user.sub, ip: req.ip ?? null };
    const r = await this.admin.moderate(actor, 'hide', body.ids, body.reason);
    return respond(adminStoreModerateResultSchema, r);
  }

  @RequireAdmin('stores.action')
  @Post('show')
  @HttpCode(200)
  async show(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminNeedModerateSchema) body: Moderate,
  ): Promise<Result> {
    const r = await this.admin.moderate({ id: user.sub, ip: req.ip ?? null }, 'show', body.ids);
    return respond(adminStoreModerateResultSchema, r);
  }
}
