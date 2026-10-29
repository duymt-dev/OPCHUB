import { Controller, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import {
  botBulkActionSchema,
  botBulkBatchSchema,
  botBulkCreateSchema,
  botBulkItemsPageSchema,
  botBulkItemsQuerySchema,
  botBulkLatestSchema,
  botBulkParamsSchema,
  botBulkSavedSchema,
  botBulkSelectionSchema,
  type BotBulkCreate,
  type BotBulkItemsQuery,
  type BotBulkSelection,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { BotBulkReadService } from './bot-bulk-read.service';
import { BotBulkControlService } from './bot-bulk-control.service';

type Params = { batchId: string };
const actor = (user: AccessClaims, req: Request) => ({ id: user.sub, ip: req.ip ?? null });

@Controller('admin/bot/bulk-scripts')
export class BotBulkController {
  constructor(
    private readonly read: BotBulkReadService,
    private readonly control: BotBulkControlService,
  ) {}
  @Get('latest')
  @RequireAdmin('bots.view')
  async latest(@CurrentUser() user: AccessClaims) {
    return respond(botBulkLatestSchema, await this.read.latest(user.sub));
  }
  @Post()
  @HttpCode(202)
  @RequireAdmin('bots.action')
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(botBulkCreateSchema) body: BotBulkCreate,
  ) {
    return respond(botBulkBatchSchema, await this.control.create(actor(user, req), body));
  }
  @Get(':batchId')
  @RequireAdmin('bots.view')
  async get(@ZodParams(botBulkParamsSchema) { batchId }: Params) {
    return respond(botBulkBatchSchema, await this.read.get(batchId));
  }
  @Get(':batchId/items')
  @RequireAdmin('bots.view')
  async items(
    @ZodParams(botBulkParamsSchema) { batchId }: Params,
    @ZodQuery(botBulkItemsQuerySchema) query: BotBulkItemsQuery,
  ) {
    return respond(botBulkItemsPageSchema, await this.read.items(batchId, query));
  }
  @Patch(':batchId/selection')
  @RequireAdmin('bots.action')
  async select(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(botBulkParamsSchema) { batchId }: Params,
    @ZodBody(botBulkSelectionSchema) body: BotBulkSelection,
  ) {
    return respond(botBulkBatchSchema, await this.control.select(actor(user, req), batchId, body));
  }
  @Post(':batchId/retry')
  @HttpCode(202)
  @RequireAdmin('bots.action')
  async retry(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(botBulkParamsSchema) { batchId }: Params,
    @ZodBody(botBulkActionSchema) _body: Record<string, never>,
  ) {
    void _body;
    return respond(botBulkBatchSchema, await this.control.retry(actor(user, req), batchId));
  }
  @Post(':batchId/save')
  @HttpCode(200)
  @RequireAdmin('bots.action')
  async save(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(botBulkParamsSchema) { batchId }: Params,
    @ZodBody(botBulkActionSchema) _body: Record<string, never>,
  ) {
    void _body;
    return respond(botBulkSavedSchema, await this.control.save(actor(user, req), batchId));
  }
}
