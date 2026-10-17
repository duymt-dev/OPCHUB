import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req } from '@nestjs/common';
import {
  type AdminCategory,
  adminCategorySchema,
  categoryOrderSchema,
  categoryPatchSchema,
  categoryUpsertSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { CategoryAdminService } from '../services/category-admin.service';
import { actorOf } from './settings.controller';

const listSchema = z.object({ items: z.array(adminCategorySchema) });
type In<S extends z.ZodType> = z.output<S>;

/** Danh mục lĩnh vực (`s.cfg`) — BR-11 */
@RequirePermission('s.cfg')
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoryAdminService) {}

  @Get()
  async list(): Promise<In<typeof listSchema>> {
    return respond(listSchema, await this.categories.list());
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(categoryUpsertSchema) body: In<typeof categoryUpsertSchema>,
  ): Promise<AdminCategory> {
    return respond(adminCategorySchema, await this.categories.create(actorOf(user, req), body));
  }

  /** Khai báo trước `:id` để không bị nuốt bởi route tham số */
  @Put('order')
  async reorder(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(categoryOrderSchema) body: In<typeof categoryOrderSchema>,
  ): Promise<AdminCategory[]> {
    return respond(
      z.array(adminCategorySchema),
      await this.categories.reorder(actorOf(user, req), body.ids),
    );
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(categoryUpsertSchema) body: In<typeof categoryUpsertSchema>,
  ): Promise<AdminCategory> {
    return respond(adminCategorySchema, await this.categories.update(actorOf(user, req), id, body));
  }

  @Patch(':id')
  async toggle(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(categoryPatchSchema) body: In<typeof categoryPatchSchema>,
  ): Promise<AdminCategory> {
    return respond(
      adminCategorySchema,
      await this.categories.toggle(actorOf(user, req), id, body.enabled),
    );
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.categories.remove(actorOf(user, req), id);
  }
}
