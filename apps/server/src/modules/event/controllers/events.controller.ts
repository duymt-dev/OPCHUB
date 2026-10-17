import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { pageSchema } from '@opchub/shared/api';
import {
  type EventRegistrationResult,
  eventItemSchema,
  eventQuerySchema,
  eventRegistrationResultSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { EventService } from '../services/event.service';

/** api-conventions: lịch sự kiện 9/trang */
const listQuerySchema = pageQuerySchema(9).extend(eventQuerySchema.shape);
const eventPageSchema = pageSchema(eventItemSchema);

/** SRS §13 Events (Portal) — cần phí thành viên còn hiệu lực */
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventService) {}

  @Get()
  async list(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(listQuerySchema) q: z.infer<typeof listQuerySchema>,
  ): Promise<z.infer<typeof eventPageSchema>> {
    return respond(eventPageSchema, await this.events.page(user.sub, q));
  }

  @Post(':id/registration')
  @HttpCode(201)
  async register(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<EventRegistrationResult> {
    return respond(eventRegistrationResultSchema, await this.events.register(user.sub, id));
  }

  @Delete(':id/registration')
  async cancel(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<EventRegistrationResult> {
    return respond(eventRegistrationResultSchema, await this.events.cancel(user.sub, id));
  }
}
