import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  groupItemSchema,
  groupQuerySchema,
  joinGroupSchema,
  type JoinGroupRequest,
  type JoinResult,
  joinResultSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { GroupService } from '../services/group.service';

/** BR-12: lưới cộng đồng 12/trang */
const listQuerySchema = pageQuerySchema(12).extend(groupQuerySchema.shape);
const groupPageSchema = pageSchema(groupItemSchema);

/** SRS §13 Groups (Portal) */
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupService) {}

  @Get()
  async list(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof groupPageSchema>> {
    return respond(groupPageSchema, await this.groups.page(user.sub, q));
  }

  @Post(':id/join')
  @HttpCode(201)
  async join(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(joinGroupSchema) body: JoinGroupRequest,
  ): Promise<JoinResult> {
    return respond(joinResultSchema, await this.groups.join(user.sub, id, body.intro));
  }

  @Delete(':id/join')
  async leave(@CurrentUser() user: AccessClaims, @Param('id') id: string): Promise<JoinResult> {
    return respond(joinResultSchema, await this.groups.leave(user.sub, id));
  }
}
