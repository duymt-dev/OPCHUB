import { Controller, Delete, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  regionalAppointSchema,
  regionalCandidateQuerySchema,
  regionalCandidatesSchema,
  regionalDirectorsSchema,
  regionalParamsSchema,
  regionalPatchSchema,
  regionalPatchBodySchema,
  regionalWriteResultSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, PermissionCheck, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodParams, ZodQuery } from '@/common/http/zod';
import { RegionalDirectorReadService } from '../services/regional-director-read.service';
import { RegionalDirectorService } from '../services/regional-director.service';

const actor = (user: AccessClaims, req: Request) => ({
  id: user.sub,
  role: user.roleName ?? '',
  ip: req.ip ?? null,
});

@Controller('admin/gdv')
export class AdminRegionalDirectorsController {
  constructor(
    private readonly read: RegionalDirectorReadService,
    private readonly write: RegionalDirectorService,
    private readonly permissions: PermissionCheck,
  ) {}

  @Get()
  @RequireAdmin('affiliate.view')
  async list(@CurrentUser() user: AccessClaims) {
    return respond(
      regionalDirectorsSchema,
      await this.read.list(await this.permissions.can(user, 'affiliate.regional')),
    );
  }

  @Get('candidates')
  @RequireAdmin('affiliate.regional')
  async candidates(
    @ZodQuery(regionalCandidateQuerySchema) q: z.infer<typeof regionalCandidateQuerySchema>,
  ) {
    return respond(regionalCandidatesSchema, await this.read.candidates(q.region, q.q));
  }

  @Post()
  @HttpCode(200)
  @RequireAdmin('affiliate.regional')
  async appoint(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(regionalAppointSchema) body: z.infer<typeof regionalAppointSchema>,
  ) {
    return respond(
      regionalWriteResultSchema,
      await this.write.appoint(actor(user, req), body.region, body.userId),
    );
  }

  @Patch(':region')
  @RequireAdmin('affiliate.regional')
  async patch(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(regionalParamsSchema) p: z.infer<typeof regionalParamsSchema>,
    @ZodBody(regionalPatchBodySchema) body: z.infer<typeof regionalPatchSchema>,
  ) {
    return respond(
      regionalWriteResultSchema,
      await this.write.patch(actor(user, req), p.region, body),
    );
  }

  @Delete(':region')
  @RequireAdmin('affiliate.regional')
  async revoke(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(regionalParamsSchema) p: z.infer<typeof regionalParamsSchema>,
  ) {
    return respond(regionalWriteResultSchema, await this.write.revoke(actor(user, req), p.region));
  }
}
