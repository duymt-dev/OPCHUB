import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  JOIN_DECISIONS,
  joinRequestSchema,
  type JoinResult,
  joinResultSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { notFound } from '@/common/errors';
import { respond } from '@/common/http/zod';
import { JoinRequestService } from '../services/join-request.service';

const listSchema = z.object({ items: z.array(joinRequestSchema) });
const decisionSchema = z.enum(JOIN_DECISIONS);

/** Chủ nhóm duyệt yêu cầu vào nhóm (D-43) — quyền kiểm trong service (owner của nhóm hoặc `c.mod`) */
@Controller('groups/:id/requests')
export class JoinRequestsController {
  constructor(private readonly requests: JoinRequestService) {}

  @Get()
  async list(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<z.infer<typeof listSchema>> {
    return respond(listSchema, { items: await this.requests.list(user, id) });
  }

  @Post(':userId/:decision')
  @HttpCode(200)
  async decide(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('decision') decision: string,
  ): Promise<JoinResult> {
    const d = decisionSchema.safeParse(decision);
    if (!d.success) throw notFound();
    return respond(joinResultSchema, await this.requests.decide(user, id, userId, d.data));
  }
}
