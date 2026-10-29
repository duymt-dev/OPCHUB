import type { Prisma } from '@opchub/db';
import type { AdminEvent, EventItem } from '@opchub/shared/api-domains';
import { vnDayLabel, vnTime } from './vn-time';

export const EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  mode: true,
  startsAt: true,
  endsAt: true,
  place: true,
  address: true,
  mapUrl: true,
  seats: true,
  registeredCount: true,
  groupId: true,
  registrationOpen: true,
  coverUrl: true,
  meetUrl: true,
} as const satisfies Prisma.EventSelect;

export type EventRow = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;

/**
 * BUG-011: `avatars` ≤ 4 ảnh người đăng ký thật (một query cho cả trang — repository).
 * EV-R04 (AT-EV01): `meetUrl` chỉ trả cho người đã đăng ký / đã tham dự.
 */
export function toEventItem(
  r: EventRow,
  registeredByMe: boolean,
  avatars: readonly string[] = [],
): EventItem {
  return {
    id: r.id,
    title: r.title,
    mode: r.mode,
    day: vnDayLabel(r.startsAt),
    time: vnTime(r.startsAt),
    place: r.place,
    seats: r.seats,
    registered: r.registeredCount,
    description: r.description,
    startsAt: r.startsAt.toISOString(),
    address: r.address,
    registeredByMe,
    coverUrl: r.coverUrl,
    avatars: avatars.slice(0, 4),
    meetUrl: registeredByMe ? r.meetUrl : null,
    mapUrl: r.mapUrl,
    registrationOpen: r.registrationOpen,
  };
}

/** Admin luôn thấy link Meet (EV-R03) */
export function toAdminEvent(r: EventRow, avatars: readonly string[] = []): AdminEvent {
  return {
    ...toEventItem(r, false, avatars),
    meetUrl: r.meetUrl,
    endTime: r.endsAt ? vnTime(r.endsAt) : null,
    groupId: r.groupId,
    registrationOpen: r.registrationOpen,
  };
}
