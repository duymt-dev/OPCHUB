import { pageSchema } from '@opchub/shared/api';
import { eventItemSchema, eventRegistrationResultSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 Events — GET /events, POST/DELETE /events/:id/registration */

/** Sự kiện 30 ngày tới ít (prototype 5) — tải một trang rồi lọc tại chỗ (Q-G3a-1) */
const ALL_SIZE = 100;

export const eventKeys = {
  all: ['events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
};

export const fetchEvents = () =>
  api(`/events?page=1&size=${ALL_SIZE}`, { schema: pageSchema(eventItemSchema) });

export const registerEvent = (id: string) =>
  api(`/events/${encodeURIComponent(id)}/registration`, {
    method: 'POST',
    schema: eventRegistrationResultSchema,
  });

export const cancelEvent = (id: string) =>
  api(`/events/${encodeURIComponent(id)}/registration`, {
    method: 'DELETE',
    schema: eventRegistrationResultSchema,
  });
