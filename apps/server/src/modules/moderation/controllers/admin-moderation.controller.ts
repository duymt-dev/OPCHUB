import { Controller, Delete, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  keywordListSchema,
  keywordSchema,
  pageQuerySchema,
  reportActionSchema,
  reportQuerySchema,
  reportSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import type { AdminActor } from '@/modules/account';
import { AdminModerationService } from '../services/admin-moderation.service';

const actorOf = (u: AccessClaims, req: Request): AdminActor => ({ id: u.sub, ip: req.ip ?? null });
const listQuery = pageQuerySchema(10).extend(reportQuerySchema.shape);
const reportPage = pageSchema(reportSchema);
type KeywordList = z.infer<typeof keywordListSchema>;

/** Admin kiểm duyệt chat (D-26) — quyền `c.mod` */
@Controller('admin')
export class AdminModerationController {
  constructor(private readonly mod: AdminModerationService) {}

  @RequireAdmin('groups.view')
  @Get('reports')
  async reports(@ZodQuery(listQuery) q: z.infer<typeof listQuery>) {
    return respond(reportPage, await this.mod.page(q, q.page, q.size));
  }

  /** Chi tiết một ca để hộp thoại xử lý mở lại (api-contract: GET cùng đường với POST) */
  @RequireAdmin('groups.view')
  @Get('reports/:id/action')
  async one(@Param('id') id: string) {
    return respond(reportSchema, await this.mod.one(id));
  }

  @RequireAdmin('groups.moderate')
  @Post('reports/:id/action')
  @HttpCode(200)
  async act(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(reportActionSchema) body: z.infer<typeof reportActionSchema>,
  ) {
    return respond(
      reportSchema,
      await this.mod.act(actorOf(user, req), id, body.action, body.note ?? null),
    );
  }

  @RequireAdmin('groups.view')
  @Get('moderation/keywords')
  async keywords(): Promise<KeywordList> {
    return respond(keywordListSchema, { items: await this.mod.keywords() });
  }

  @RequireAdmin('groups.moderate')
  @Post('moderation/keywords')
  @HttpCode(201)
  async add(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(keywordSchema) body: z.infer<typeof keywordSchema>,
  ): Promise<KeywordList> {
    return respond(keywordListSchema, {
      items: await this.mod.addKeyword(actorOf(user, req), body.word),
    });
  }

  /** Express đã giải mã `%xx` trong param */
  @RequireAdmin('groups.moderate')
  @Delete('moderation/keywords/:word')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('word') word: string,
  ): Promise<KeywordList> {
    return respond(keywordListSchema, {
      items: await this.mod.removeKeyword(actorOf(user, req), word),
    });
  }
}
