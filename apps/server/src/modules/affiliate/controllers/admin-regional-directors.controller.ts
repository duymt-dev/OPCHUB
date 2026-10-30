import { Controller, Delete, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import {
  directorAppointmentSchema,
  directorConfigPatchSchema,
  directorConfigSchema,
  directorHistoryQuerySchema,
  directorHistorySchema,
  directorMemberPageSchema,
  directorMemberQuerySchema,
  directorRegionParamsSchema,
  directorRevokeSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { RegionalDirectorService } from '../services/regional-director.service';
import { RegionalDirectorReadService } from '../services/regional-director-read.service';

@Controller('admin/gdv')
export class AdminRegionalDirectorsController {
  constructor(
    private readonly read: RegionalDirectorReadService,
    private readonly write: RegionalDirectorService,
  ) {}

  @Get()
  @RequireAdmin('affiliate.view')
  async config() {
    return respond(directorConfigSchema, await this.read.config());
  }

  @Get('members')
  @RequireAdmin('affiliate.view')
  async members(
    @ZodQuery(directorMemberQuerySchema) query: z.infer<typeof directorMemberQuerySchema>,
  ) {
    return respond(directorMemberPageSchema, await this.read.candidates(query));
  }

  @Get('history')
  @RequireAdmin('affiliate.view')
  async history(
    @ZodQuery(directorHistoryQuerySchema) query: z.infer<typeof directorHistoryQuerySchema>,
  ) {
    return respond(directorHistorySchema, await this.read.history(query));
  }

  @Post()
  @HttpCode(200)
  @RequireAdmin('affiliate.gdv')
  async appoint(
    @CurrentUser() user: AccessClaims,
    @Req() request: Request,
    @ZodBody(directorAppointmentSchema) body: z.infer<typeof directorAppointmentSchema>,
  ) {
    await this.write.appoint({ id: user.sub, ip: request.ip ?? null }, body);
    return this.config();
  }

  @Patch(':region')
  @RequireAdmin('affiliate.gdv')
  async patch(
    @CurrentUser() user: AccessClaims,
    @Req() request: Request,
    @ZodParams(directorRegionParamsSchema) params: z.infer<typeof directorRegionParamsSchema>,
    @ZodBody(directorConfigPatchSchema) body: z.infer<typeof directorConfigPatchSchema>,
  ) {
    await this.write.configure({ id: user.sub, ip: request.ip ?? null }, params.region, body);
    return this.config();
  }

  @Delete(':region')
  @HttpCode(200)
  @RequireAdmin('affiliate.gdv')
  async revoke(
    @CurrentUser() user: AccessClaims,
    @Req() request: Request,
    @ZodParams(directorRegionParamsSchema) params: z.infer<typeof directorRegionParamsSchema>,
    @ZodBody(directorRevokeSchema) body: z.infer<typeof directorRevokeSchema>,
  ) {
    await this.write.revoke({ id: user.sub, ip: request.ip ?? null }, params.region, body.version);
    return this.config();
  }
}
