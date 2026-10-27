import { Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import {
  type AdminStore,
  type AdminStoreList,
  adminStoreListSchema,
  adminStoreModerateResultSchema,
  adminStoreModerateSchema,
  adminStoreQuerySchema,
  adminStoreFeaturedSchema,
  adminStoreSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { StoreAdminService } from '../services/store-admin.service';

type Moderate = z.infer<typeof adminStoreModerateSchema>;
type Result = z.infer<typeof adminStoreModerateResultSchema>;

/** AD-07 Admin › Gian hàng: `stores.view` xem, `stores.action` ẩn / hiện (audit) */
@Controller('admin/stores')
export class AdminStoreController {
  constructor(private readonly admin: StoreAdminService) {}

  @RequireAdmin('stores.view')
  @Get()
  async list(
    @ZodQuery(adminStoreQuerySchema) q: z.infer<typeof adminStoreQuerySchema>,
  ): Promise<AdminStoreList> {
    return respond(adminStoreListSchema, await this.admin.list(q.status, q.q, q.page));
  }

  @RequireAdmin('stores.view')
  @Get(':id')
  async detail(@Param('id') id: string): Promise<AdminStore> {
    return respond(adminStoreSchema, await this.admin.detail(id));
  }

  @RequireAdmin('stores.action')
  @Post('hide')
  @HttpCode(200)
  async hide(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminStoreModerateSchema) body: Moderate,
  ): Promise<Result> {
    const r = await this.admin.moderate(
      { id: user.sub, ip: req.ip ?? null },
      'hide',
      body.ids,
      body.reason,
    );
    return respond(adminStoreModerateResultSchema, r);
  }

  /** D-89 (P-105): gắn / gỡ "Nổi bật" trên Khám phá */
  @RequireAdmin('stores.action')
  @Put(':id/featured')
  async feature(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminStoreFeaturedSchema) body: z.infer<typeof adminStoreFeaturedSchema>,
  ): Promise<AdminStore> {
    const r = await this.admin.feature({ id: user.sub, ip: req.ip ?? null }, id, body.featured);
    return respond(adminStoreSchema, r);
  }

  @RequireAdmin('stores.action')
  @Post('show')
  @HttpCode(200)
  async show(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminStoreModerateSchema) body: Moderate,
  ): Promise<Result> {
    const r = await this.admin.moderate({ id: user.sub, ip: req.ip ?? null }, 'show', body.ids);
    return respond(adminStoreModerateResultSchema, r);
  }
}
