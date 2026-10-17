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
} as const satisfies Prisma.EventSelect;

export type EventRow = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;

export function toEventItem(r: EventRow, registeredByMe: boolean): EventItem {
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
  };
}

export function toAdminEvent(r: EventRow): AdminEvent {
  return {
    ...toEventItem(r, false),
    endTime: r.endsAt ? vnTime(r.endsAt) : null,
    mapUrl: r.mapUrl,
    groupId: r.groupId,
    registrationOpen: r.registrationOpen,
    coverUrl: r.coverUrl,
  };
}
