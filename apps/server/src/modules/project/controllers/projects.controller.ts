import { Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  pageQuerySchema,
  type ProjectCard,
  projectCardSchema,
  type ProjectDetail,
  projectDetailSchema,
  projectListQuerySchema,
  type ProjectSaveData,
  projectSaveSchema,
  type ProjectStats,
  projectStatsSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, AllowAccountTypes, CurrentUser } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { ProjectReadService } from '../services/project-read.service';
import { ProjectWriteService } from '../services/project-write.service';

const listQuerySchema = pageQuerySchema(9).extend(projectListQuerySchema.shape);
const cardPageSchema = pageSchema(projectCardSchema);
const cardListSchema = z.object({ items: z.array(projectCardSchema) });

/** SRS §13 Projects (Portal). Đọc: thành viên còn phí + Nhà đầu tư (D-14) */
@Controller()
export class ProjectsController {
  constructor(
    private readonly read: ProjectReadService,
    private readonly write: ProjectWriteService,
  ) {}

  @AllowAccountTypes('investor')
  @Get('projects/stats')
  async stats(@CurrentUser() user: AccessClaims): Promise<ProjectStats> {
    return respond(projectStatsSchema, await this.read.stats(user.sub));
  }

  @AllowAccountTypes('investor')
  @Get('projects')
  async list(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof cardPageSchema>> {
    return respond(cardPageSchema, await this.read.explore(user.sub, q, q.page, q.size));
  }

  @AllowAccountTypes('investor')
  @Get('projects/:id')
  async detail(@CurrentUser() user: AccessClaims, @Param('id') id: string): Promise<ProjectDetail> {
    return respond(projectDetailSchema, await this.read.detail(user.sub, id));
  }

  @Get('me/projects')
  async mine(@CurrentUser() user: AccessClaims): Promise<z.infer<typeof cardListSchema>> {
    return respond(cardListSchema, await this.read.mine(user.sub));
  }

  @Get('me/projects/:id')
  async own(@CurrentUser() user: AccessClaims, @Param('id') id: string): Promise<ProjectDetail> {
    return respond(projectDetailSchema, await this.read.ownDetail(user.sub, id));
  }

  @Post('projects')
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @ZodBody(projectSaveSchema) body: ProjectSaveData,
  ): Promise<ProjectCard> {
    return respond(projectCardSchema, await this.write.create(user.sub, body));
  }

  @Patch('projects/:id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(projectSaveSchema) body: ProjectSaveData,
  ): Promise<ProjectCard> {
    return respond(projectCardSchema, await this.write.update(user.sub, id, body));
  }
}
