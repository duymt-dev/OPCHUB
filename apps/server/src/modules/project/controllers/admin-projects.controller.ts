import { Controller, Delete, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type AdminProject,
  adminProjectReviewSchema,
  adminProjectSchema,
  pageQuerySchema,
  projectBulkResultSchema,
  projectBulkSchema,
  type ProjectCounts,
  projectCountsSchema,
  projectFeatureSchema,
} from '@opchub/shared/api-domains';
import { PROJECT_STATUS } from '@opchub/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, ProjectAdminService } from '../services/project-admin.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
const listQuerySchema = pageQuerySchema(10).extend({ status: z.enum(PROJECT_STATUS).optional() });
const adminPageSchema = pageSchema(adminProjectSchema);
type In<S extends z.ZodType> = z.infer<S>;

/** Admin "Kiểm duyệt dự án" (G5b) — mọi route `p.pub` */
@Controller('admin/projects')
export class AdminProjectsController {
  constructor(private readonly admin: ProjectAdminService) {}

  @RequireAdmin('projects.view')
  @Get()
  async list(
    @ZodQuery(listQuerySchema) q: In<typeof listQuerySchema>,
  ): Promise<In<typeof adminPageSchema>> {
    return respond(adminPageSchema, await this.admin.page(q));
  }

  @RequireAdmin('projects.view')
  @Get('counts')
  async counts(): Promise<ProjectCounts> {
    return respond(projectCountsSchema, await this.admin.counts());
  }

  @RequireAdmin('projects.action')
  @Put('featured')
  async feature(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(projectFeatureSchema) body: In<typeof projectFeatureSchema>,
  ): Promise<In<typeof projectFeatureSchema>> {
    return respond(
      projectFeatureSchema,
      await this.admin.feature(actorOf(user, req), body.projectId),
    );
  }

  @RequireAdmin('projects.action')
  @Post('bulk')
  @HttpCode(200)
  async bulk(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(projectBulkSchema) body: In<typeof projectBulkSchema>,
  ): Promise<In<typeof projectBulkResultSchema>> {
    return respond(
      projectBulkResultSchema,
      await this.admin.bulk(actorOf(user, req), body.ids, body.action),
    );
  }

  @RequireAdmin('projects.view')
  @Get(':id')
  async detail(@Param('id') id: string): Promise<AdminProject> {
    return respond(adminProjectSchema, await this.admin.detail(id));
  }

  @RequireAdmin('projects.action')
  @Post(':id/review')
  @HttpCode(200)
  async review(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminProjectReviewSchema, { rich: ['note'] })
    body: In<typeof adminProjectReviewSchema>,
  ): Promise<AdminProject> {
    return respond(adminProjectSchema, await this.admin.review(actorOf(user, req), id, body));
  }

  @RequireAdmin('projects.action')
  @Delete(':id')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.admin.remove(actorOf(user, req), id);
  }
}
