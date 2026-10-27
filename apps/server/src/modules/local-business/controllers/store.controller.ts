import { Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  type StoreDetail,
  storeDetailSchema,
  type StoreFavoriteResult,
  storeFavoriteResultSchema,
  storeFavoriteSchema,
  type StoreList,
  storeListQuerySchema,
  storeListSchema,
  storeUpsertSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { type AccessClaims, AllowAccountTypes, CurrentUser } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { StoreExploreService } from '../services/store-explore.service';
import { StoreOwnerService } from '../services/store-owner.service';

const owner = (u: AccessClaims) => ({ id: u.sub, accountType: u.accountType });

/**
 * UP-08: Khám phá + chi tiết gian hàng — thành viên đã đóng phí (paywall mặc định), NĐT chỉ xem.
 * D-75: chỉ TK Doanh nghiệp có "Gian hàng của tôi".
 */
@Controller()
export class StoreController {
  constructor(
    private readonly explore: StoreExploreService,
    private readonly owner: StoreOwnerService,
  ) {}

  @AllowAccountTypes('investor')
  @Get('stores')
  async list(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(storeListQuerySchema) q: z.infer<typeof storeListQuerySchema>,
  ): Promise<StoreList> {
    return respond(storeListSchema, await this.explore.list(user.sub, q));
  }

  /** D-89 (P-105): tim yêu thích gian hàng */
  @AllowAccountTypes('investor')
  @Put('stores/:id/favorite')
  async favorite(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(storeFavoriteSchema) body: z.infer<typeof storeFavoriteSchema>,
  ): Promise<StoreFavoriteResult> {
    return respond(storeFavoriteResultSchema, await this.explore.favorite(user.sub, id, body.on));
  }

  @AllowAccountTypes('investor')
  @Get('stores/:id')
  async detail(@CurrentUser() user: AccessClaims, @Param('id') id: string): Promise<StoreDetail> {
    return respond(storeDetailSchema, await this.explore.detail(user.sub, id));
  }

  @Get('me/store')
  async mine(@CurrentUser() user: AccessClaims): Promise<StoreDetail> {
    return respond(storeDetailSchema, await this.owner.mine(owner(user)));
  }

  @Put('me/store')
  async save(
    @CurrentUser() user: AccessClaims,
    @ZodBody(storeUpsertSchema) body: z.infer<typeof storeUpsertSchema>,
  ): Promise<StoreDetail> {
    return respond(storeDetailSchema, await this.owner.save(owner(user), body));
  }

  @Post('me/store/publish')
  @HttpCode(200)
  async publish(@CurrentUser() user: AccessClaims): Promise<StoreDetail> {
    return respond(storeDetailSchema, await this.owner.publish(owner(user)));
  }

  @Post('me/store/unpublish')
  @HttpCode(200)
  async unpublish(@CurrentUser() user: AccessClaims): Promise<StoreDetail> {
    return respond(storeDetailSchema, await this.owner.unpublish(owner(user)));
  }
}
