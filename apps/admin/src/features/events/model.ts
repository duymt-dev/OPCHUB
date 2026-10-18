import type { AdminEvent, AdminEventUpsertInput } from '@opchub/shared/api-domains';
import type {
  EventFill,
  EventFormErrors,
  EventFormState,
  EventsParams,
  EventStats,
  EventView,
} from './types';

/** Logic thuần của màn Nội dung & Sự kiện (test ở model.spec.ts) */

const VN_OFFSET_MS = 7 * 36e5;
const DAY_MS = 864e5;

/** Lấp đầy ≥ 100% → Đã đầy; ≥ 60% → Sắp đầy; còn lại Đang mở (prototype aePage) */
export function fillOf(registered: number, seats: number): EventFill {
  const p = registered / Math.max(1, seats);
  if (p >= 1) return 'full';
  return p >= 0.6 ? 'almost' : 'open';
}

export const toEventViews = (list: AdminEvent[]): EventView[] =>
  list.map((e, order) => ({
    ...e,
    order,
    fill: fillOf(e.registered, e.seats),
    pct: Math.min(100, Math.round((e.registered / Math.max(1, e.seats)) * 100)),
  }));

/** Lọc trạng thái + hình thức + tìm theo tên/địa điểm (không phân biệt hoa thường) */
export function filterEvents(all: EventView[], p: Pick<EventsParams, 'q' | 'status' | 'mode'>) {
  const q = p.q.trim().toLowerCase();
  return all.filter(
    (e) =>
      (p.status === 'all' || e.fill === p.status) &&
      (p.mode === 'all' || e.mode === p.mode) &&
      (!q || `${e.title} ${e.place}`.toLowerCase().includes(q)),
  );
}

export function eventStats(all: EventView[]): EventStats {
  const registrations = all.reduce((a, e) => a + e.registered, 0);
  const seats = all.reduce((a, e) => a + e.seats, 0);
  return {
    upcoming: all.length,
    registrations,
    fillRate: seats ? Math.round((registrations / seats) * 100) : 0,
    online: all.filter((e) => e.mode === 'online').length,
  };
}

export function pageSlice<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(Math.max(1, page), pages);
  return { page: cur, items: list.slice((cur - 1) * size, cur * size) };
}

export const formatCount = (n: number) => n.toLocaleString('vi-VN');

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → ngày theo giờ VN (yyyy-mm-dd) */
export function vnDateOf(isoStr: string): string {
  const d = new Date(Date.parse(isoStr) + VN_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** yyyy-mm-dd + HH:MM (giờ VN) → ISO UTC */
export function vnToIso(date: string, time: string): string {
  const [y = 2026, m = 1, d = 1] = date.split('-').map(Number);
  const [hh = 0, mi = 0] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mi) - VN_OFFSET_MS).toISOString();
}

/** Số ngày lịch (giờ VN) từ `isoStr` tới `now` */
export function daysAgo(isoStr: string, now: number): number {
  const day = (ms: number) => Math.floor((ms + VN_OFFSET_MS) / DAY_MS);
  return Math.max(0, day(now) - day(Date.parse(isoStr)));
}

export const emptyEventForm = (): EventFormState => ({
  id: null,
  title: '',
  mode: 'offline',
  date: '',
  currentDay: '',
  startsAt: null,
  start: '19:00',
  end: '21:00',
  place: '',
  address: '',
  mapUrl: '',
  seats: '50',
  groupId: '',
  description: '',
  registrationOpen: true,
  coverUrl: null,
});

/** Sửa: để trống ngày (gợi ý "Hiện tại: …"), giữ ngày cũ nếu không chọn lại — như prototype */
export const formFromEvent = (e: AdminEvent): EventFormState => ({
  id: e.id,
  title: e.title,
  mode: e.mode,
  date: '',
  currentDay: e.day,
  startsAt: e.startsAt,
  start: e.time,
  end: e.endTime ?? '',
  place: e.place,
  address: e.address ?? '',
  mapUrl: e.mapUrl ?? '',
  seats: String(e.seats),
  groupId: e.groupId ?? '',
  description: e.description,
  registrationOpen: e.registrationOpen,
  coverUrl: e.coverUrl,
});

const isHttp = (v: string) => /^https?:\/\//.test(v);

/**
 * Kiểm MỌI ô (BUG-022), thứ tự khoá theo prototype (efVals.save) — khoá đầu là ô focus + toast.
 * Rỗng = hợp lệ.
 */
export function validateEvent(f: EventFormState): EventFormErrors {
  const e: EventFormErrors = {};
  const title = f.title.trim();
  if (!title) e.title = 'title';
  else if (title.length < 3) e.title = 'titleShort';
  if (!f.date && !f.id) e.date = 'date';
  if (!f.place.trim()) e.place = f.mode === 'online' ? 'link' : 'place';
  if (f.mode === 'offline' && !f.address.trim()) e.address = 'address';
  if (f.mode === 'offline' && f.mapUrl.trim() && !isHttp(f.mapUrl.trim())) e.map = 'map';
  return e;
}

/** path lỗi server (POST/PATCH /admin/events) → ô form */
export const EVENT_FIELD_MAP = {
  title: 'title',
  startsAt: 'date',
  place: 'place',
  address: 'address',
  mapUrl: 'map',
} as const;

/** Form → thân POST/PATCH /admin/events */
export function formToUpsert(f: EventFormState, descDefault: string): AdminEventUpsertInput {
  const start = f.start || '19:00';
  const date = f.date || (f.startsAt ? vnDateOf(f.startsAt) : '');
  const offline = f.mode === 'offline';
  const plain = f.description.replace(/<[^>]*>/g, '').trim();
  return {
    title: f.title.trim(),
    mode: f.mode,
    startsAt: vnToIso(date, start),
    place: f.place.trim(),
    ...(offline && f.address.trim() ? { address: f.address.trim() } : {}),
    seats: Math.max(1, Math.floor(Number(f.seats)) || 1),
    description: plain ? f.description : descDefault,
    endTime: f.end || null,
    mapUrl: offline && f.mapUrl.trim() ? f.mapUrl.trim() : null,
    groupId: f.groupId || null,
    registrationOpen: f.registrationOpen,
    coverUrl: f.coverUrl,
  };
}

/** Link Google Maps: link nhập tay, nếu trống thì tìm theo địa chỉ / địa điểm */
export const mapLinkOf = (f: Pick<EventFormState, 'mapUrl' | 'address' | 'place'>) =>
  f.mapUrl.trim() ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.address || f.place)}`;

export const mapEmbedOf = (address: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

/** CSV có BOM → tải xuống ở trình duyệt */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
