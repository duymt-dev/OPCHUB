import { Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  type MyNeeds,
  myNeedsSchema,
  type Need,
  needActionSchema,
  needCreateSchema,
  type NeedList,
  needListQuerySchema,
  needListSchema,
  needSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { type AccessClaims, AllowAccountTypes, CurrentUser } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { NeedExploreService } from '../services/need-explore.service';
import { NeedOwnerService } from '../services/need-owner.service';

const owner = (u: AccessClaims) => ({ id: u.sub, accountType: u.accountType });

/**
 * UP-09 Nhu cầu địa phương: danh sách cho thành viên đã đóng phí (paywall mặc định), NĐT chỉ xem.
 * D-75: chỉ chủ gian hàng (TK Doanh nghiệp) đăng / đóng / mở lại / xoá.
 */
@Controller()
export class NeedController {
  constructor(
    private readonly explore: NeedExploreService,
    private readonly owner: NeedOwnerService,
  ) {}

  @AllowAccountTypes('investor')
  @Get('needs')
  async list(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(needListQuerySchema) q: z.infer<typeof needListQuerySchema>,
  ): Promise<NeedList> {
    return respond(needListSchema, await this.explore.list(user.sub, q));
  }

  @Get('me/needs')
  async mine(@CurrentUser() user: AccessClaims): Promise<MyNeeds> {
    return respond(myNeedsSchema, await this.owner.mine(owner(user)));
  }

  @Post('me/needs')
  async create(
    @CurrentUser() user: AccessClaims,
    @ZodBody(needCreateSchema) body: z.infer<typeof needCreateSchema>,
  ): Promise<Need> {
    return respond(needSchema, await this.owner.create(owner(user), body));
  }

  @Patch('me/needs/:id')
  async step(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(needActionSchema) body: z.infer<typeof needActionSchema>,
  ): Promise<Need> {
    return respond(needSchema, await this.owner.step(owner(user), id, body.action));
  }

  @Delete('me/needs/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AccessClaims, @Param('id') id: string): Promise<void> {
    await this.owner.remove(owner(user), id);
  }
}
