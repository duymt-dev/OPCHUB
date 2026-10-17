import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  botActivityListSchema,
  botLogSchema,
  type BotScript,
  type BotSettings,
  botSettingsPatchSchema,
  botSettingsSchema,
  botThreadApprovedSchema,
  botThreadListSchema,
  idResultSchema,
  pageQuerySchema,
  type Persona,
  personaListSchema,
  personaSchema,
  personaUpsertSchema,
  scriptListSchema,
  scriptRunSchema,
  scriptSchema,
  scriptUpsertSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, BotCatalogService } from './services/bot-catalog.service';
import { BotLogService } from './services/bot-log.service';
import { BotThreadService } from './services/bot-thread.service';

type In<S extends z.ZodType> = z.output<S>;
type Out<S extends z.ZodType> = z.infer<S>;
const logQuery = pageQuerySchema(10);
const logPage = pageSchema(botLogSchema);
const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });

/** Bot tương tác (FEATURE_BOTS, `c.mod`) — SRS §13 Bot + Q-G4d-1 */
@RequirePermission('c.mod')
@Controller('admin')
export class BotController {
  constructor(
    private readonly catalog: BotCatalogService,
    private readonly threads: BotThreadService,
    private readonly botLog: BotLogService,
  ) {}

  @Get('personas')
  async personas(): Promise<Out<typeof personaListSchema>> {
    return respond(personaListSchema, { items: await this.catalog.personas() });
  }

  @Post('personas')
  @HttpCode(201)
  async createPersona(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(personaUpsertSchema) b: In<typeof personaUpsertSchema>,
  ): Promise<Persona> {
    return respond(personaSchema, await this.catalog.createPersona(actorOf(u, req), b));
  }

  @Patch('personas/:id')
  async updatePersona(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(personaUpsertSchema) b: In<typeof personaUpsertSchema>,
  ): Promise<Persona> {
    return respond(personaSchema, await this.catalog.updatePersona(actorOf(u, req), id, b));
  }

  @Delete('personas/:id')
  async removePersona(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Out<typeof idResultSchema>> {
    return respond(idResultSchema, await this.catalog.removePersona(actorOf(u, req), id));
  }

  @Get('scripts')
  async scripts(): Promise<Out<typeof scriptListSchema>> {
    return respond(scriptListSchema, { items: await this.catalog.scripts() });
  }

  @Post('scripts')
  @HttpCode(201)
  async createScript(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(scriptUpsertSchema) b: In<typeof scriptUpsertSchema>,
  ): Promise<BotScript> {
    return respond(scriptSchema, await this.catalog.createScript(actorOf(u, req), b));
  }

  @Patch('scripts/:id')
  async updateScript(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(scriptUpsertSchema) b: In<typeof scriptUpsertSchema>,
  ): Promise<BotScript> {
    return respond(scriptSchema, await this.catalog.updateScript(actorOf(u, req), id, b));
  }

  @Delete('scripts/:id')
  async removeScript(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Out<typeof idResultSchema>> {
    return respond(idResultSchema, await this.catalog.removeScript(actorOf(u, req), id));
  }

  @Post('scripts/:id/run')
  @HttpCode(202)
  async run(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Out<typeof scriptRunSchema>> {
    return respond(scriptRunSchema, await this.threads.run(actorOf(u, req), id));
  }

  @Get('bot/threads')
  async list(): Promise<Out<typeof botThreadListSchema>> {
    return respond(botThreadListSchema, { items: await this.threads.list() });
  }

  @Post('bot/threads/:id/approve')
  @HttpCode(200)
  async approve(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Out<typeof botThreadApprovedSchema>> {
    return respond(botThreadApprovedSchema, await this.threads.approve(actorOf(u, req), id));
  }

  @Delete('bot/threads/:id')
  async discard(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<Out<typeof idResultSchema>> {
    return respond(idResultSchema, await this.threads.discard(actorOf(u, req), id));
  }

  @Get('bot/activity')
  async activity(): Promise<Out<typeof botActivityListSchema>> {
    return respond(botActivityListSchema, await this.threads.activity());
  }

  @Get('bot/log')
  async log(@ZodQuery(logQuery) q: In<typeof logQuery>): Promise<Out<typeof logPage>> {
    return respond(logPage, await this.botLog.page(q.page, q.size));
  }

  @Get('bot/settings')
  async settings(): Promise<BotSettings> {
    return respond(botSettingsSchema, await this.threads.getSettings());
  }

  @Patch('bot/settings')
  async patchSettings(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(botSettingsPatchSchema) b: In<typeof botSettingsPatchSchema>,
  ): Promise<BotSettings> {
    return respond(botSettingsSchema, await this.threads.patchSettings(actorOf(u, req), b));
  }
}
