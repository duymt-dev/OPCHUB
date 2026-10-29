import type { EventItem } from '@opchub/shared/api-domains';
import { eventDay } from '@/i18n/format';
import type { EventFilter, EventsParams, EventView, RegState } from './types';

/** Logic thuần của màn Sự kiện (test ở model.spec.ts) */

export function regStateOf(e: EventItem): RegState {
  if (e.registeredByMe) return 'registered';
  if (!e.registrationOpen) return 'closed';
  return e.registered >= e.seats ? 'full' : 'open';
}

export function toEventView(e: EventItem, order: number): EventView {
  return {
    ...e,
    // D-65: server gửi thứ viết tắt tiếng Việt ("T5, 22/10") — ngôn ngữ khác dựng lại từ startsAt
    day: eventDay(e.startsAt, e.day).day,
    order,
    reg: regStateOf(e),
    regText: `${e.registered}/${e.seats}`,
    pct: Math.min(100, Math.round((e.registered / e.seats) * 100)),
  };
}

const matchFilter = (e: EventView, f: EventFilter) =>
  f === 'all' ||
  (f === 'mine' && e.registeredByMe) ||
  (f === 'online' && e.mode === 'online') ||
  (f === 'offline' && e.mode === 'offline');

/** Tìm theo tên + địa điểm (không phân biệt hoa thường), như prototype */
export function filterEvents(all: EventView[], p: EventsParams): EventView[] {
  const q = p.q.trim().toLowerCase();
  return all.filter(
    (e) => matchFilter(e, p.filter) && (!q || `${e.title} ${e.place}`.toLowerCase().includes(q)),
  );
}

export interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Đếm ngược tới `startsAt` (đã qua → 00) */
export function countdown(startsAt: string, now: number): Countdown {
  const diff = Math.max(0, Date.parse(startsAt) - now);
  return {
    days: pad(Math.floor(diff / 864e5)),
    hours: pad(Math.floor(diff / 36e5) % 24),
    minutes: pad(Math.floor(diff / 6e4) % 60),
    seconds: pad(Math.floor(diff / 1e3) % 60),
  };
}

/** Link Google Maps chỉ đường theo địa chỉ */
export const mapLinkOf = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const mapEmbedOf = (address: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
