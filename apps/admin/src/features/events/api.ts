import { pageSchema } from '@opchub/shared/api';
import {
  adminEventSchema,
  adminUpcomingSchema,
  eventCheckInResultSchema,
  eventRegistrantSchema,
  eventRegistrantsExportSchema,
  groupItemSchema,
  type AdminEventUpsertInput,
  type EventCheckIn,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 Events (admin) + check-in / xuất danh sách đăng ký (Q-G5a-1) */

/** Số sự kiện nhỏ — tải trọn rồi lọc/đếm tại chỗ như prototype */
const ALL = 100;

export const eventKeys = {
  all: ['admin-events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
  upcoming: () => [...eventKeys.all, 'upcoming'] as const,
  registrants: (id: string) => [...eventKeys.all, 'registrants', id] as const,
  groups: () => ['admin-event-groups'] as const,
};

const enc = encodeURIComponent;

export const fetchEvents = () =>
  api(`/admin/events?page=1&size=${ALL}`, { schema: pageSchema(adminEventSchema) });

/** EV-R02: sự kiện gần nhất + 3 sự kiện tiếp theo (đang mở đăng ký) */
export const fetchUpcoming = () => api('/admin/events/upcoming', { schema: adminUpcomingSchema });

export const saveEvent = (body: AdminEventUpsertInput, id: string | null) =>
  api(id ? `/admin/events/${enc(id)}` : '/admin/events', {
    method: id ? 'PATCH' : 'POST',
    body,
    schema: adminEventSchema,
  });

export const fetchRegistrants = (id: string) =>
  api(`/admin/events/${enc(id)}/registrations?page=1&size=${ALL}`, {
    schema: pageSchema(eventRegistrantSchema),
  });

export const checkIn = (id: string, body: EventCheckIn) =>
  api(`/admin/events/${enc(id)}/registrations/check-in`, {
    method: 'POST',
    body,
    schema: eventCheckInResultSchema,
  });

export const exportRegistrants = (id: string) =>
  api(`/admin/events/${enc(id)}/registrations/export`, {
    method: 'POST',
    schema: eventRegistrantsExportSchema,
  });

/** Nhóm tổ chức (danh sách nhóm cộng đồng) */
export const fetchGroups = () =>
  api(`/admin/groups?page=1&size=${ALL}`, { schema: pageSchema(groupItemSchema) });
