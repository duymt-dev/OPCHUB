import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type AdminEvent,
  type AdminEventUpsert,
  adminEventSchema,
  adminEventUpsertSchema,
  type EventCheckIn,
  eventCheckInSchema,
  eventRegistrantSchema,
  type EventRegistrantsExport,
  eventRegistrantsExportSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { type Actor, EventAdminService } from '../services/event-admin.service';
import { EventRegistrantsService } from '../services/event-registrants.service';

const actorOf = (u: AccessClaims, req: Request): Actor => ({ id: u.sub, ip: req.ip ?? null });
/** NA-27: mô tả sự kiện là rich text (RichEditor) */
const RICH = { rich: ['description'] } as const;
const listQuerySchema = pageQuerySchema(10);
const adminPageSchema = pageSchema(adminEventSchema);
const registrantPageSchema = pageSchema(eventRegistrantSchema);
const registrantListSchema = z.object({ items: z.array(eventRegistrantSchema) });

/**
 * Admin "Nội dung & Sự kiện". Ghi sự kiện `e.edit`; xem lịch + danh sách đăng ký, check-in, xuất `e.reg`
 * (điều phối viên có `e.reg` thấy menu Sự kiện — Q-B31-1).
 */
@Controller('admin/events')
export class AdminEventsController {
  constructor(
    private readonly admin: EventAdminService,
    private readonly registrants: EventRegistrantsService,
  ) {}

  @RequireAdmin('events.view')
  @Get()
  async list(
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof adminPageSchema>> {
    return respond(adminPageSchema, await this.admin.page(q));
  }

  @RequireAdmin('events.action')
  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(adminEventUpsertSchema, RICH) body: AdminEventUpsert,
  ): Promise<AdminEvent> {
    return respond(adminEventSchema, await this.admin.create(actorOf(user, req), body));
  }

  @RequireAdmin('events.action')
  @Patch(':id')
  async update(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(adminEventUpsertSchema, RICH) body: AdminEventUpsert,
  ): Promise<AdminEvent> {
    return respond(adminEventSchema, await this.admin.update(actorOf(user, req), id, body));
  }

  @RequireAdmin('events.action')
  @Delete(':id')
  async remove(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.admin.remove(actorOf(user, req), id);
  }

  @RequireAdmin('events.view')
  @Get(':id/registrations')
  async registrations(
    @Param('id') id: string,
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof registrantPageSchema>> {
    return respond(registrantPageSchema, await this.registrants.page(id, q.page, q.size));
  }

  @RequireAdmin('events.action')
  @Post(':id/registrations/check-in')
  @HttpCode(200)
  async checkIn(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(eventCheckInSchema) body: EventCheckIn,
  ): Promise<z.infer<typeof registrantListSchema>> {
    return respond(
      registrantListSchema,
      await this.registrants.checkIn(actorOf(user, req), id, body),
    );
  }

  @RequireAdmin('events.action')
  @Post(':id/registrations/export')
  @HttpCode(200)
  async export(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<EventRegistrantsExport> {
    return respond(
      eventRegistrantsExportSchema,
      await this.registrants.export(actorOf(user, req), id),
    );
  }
}
