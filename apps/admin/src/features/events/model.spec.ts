import type { AdminEvent } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import {
  daysAgo,
  emptyEventForm,
  eventStats,
  fillOf,
  filterEvents,
  formFromEvent,
  formToUpsert,
  inDaysKey,
  meetShort,
  pageSlice,
  toEventViews,
  validateEvent,
  vnDateOf,
  vnToIso,
} from './model';

const ev = (id: string, mode: AdminEvent['mode'], seats: number, registered: number, title = id) =>
  ({
    id,
    title,
    mode,
    day: 'T5, 22/10',
    time: '19:30',
    place: mode === 'online' ? 'Zoom' : 'MediaSoft Hub, Hà Nội',
    seats,
    registered,
    description: '',
    startsAt: '2026-10-22T12:30:00.000Z',
    address: mode === 'offline' ? '18 Tam Trinh' : null,
    registeredByMe: false,
    endTime: null,
    mapUrl: null,
    meetUrl: null,
    groupId: null,
    registrationOpen: true,
    coverUrl: null,
    avatars: [],
  }) satisfies AdminEvent;

const ALL = toEventViews([
  ev('e1', 'offline', 80, 54, 'OPC Meetup #12'),
  ev('e2', 'online', 200, 144, 'Workshop AI'),
  ev('e3', 'online', 150, 61),
  ev('e4', 'offline', 120, 120),
  ev('e5', 'offline', 30, 12),
]);

describe('fillOf', () => {
  it('chia ngưỡng 60% / 100% như prototype', () => {
    expect(fillOf(54, 80)).toBe('almost');
    expect(fillOf(61, 150)).toBe('open');
    expect(fillOf(120, 120)).toBe('full');
  });
});

describe('filterEvents + eventStats', () => {
  const base = { q: '', status: 'all', mode: 'all' } as const;
  it('lọc trạng thái, hình thức, tìm theo tên/địa điểm', () => {
    expect(filterEvents(ALL, { ...base, status: 'full' }).map((e) => e.id)).toEqual(['e4']);
    expect(filterEvents(ALL, { ...base, status: 'almost' })).toHaveLength(2);
    expect(filterEvents(ALL, { ...base, mode: 'online' })).toHaveLength(2);
    expect(filterEvents(ALL, { ...base, q: 'zoom' }).map((e) => e.id)).toEqual(['e2', 'e3']);
    expect(filterEvents(ALL, { ...base, q: 'zzzz' })).toHaveLength(0);
  });
  it('thống kê như prototype seed: 5 / 391 / 67% / 2', () => {
    expect(eventStats(ALL)).toEqual({ upcoming: 5, registrations: 391, fillRate: 67, online: 2 });
  });
  it('phân trang kẹp trang vượt quá', () => {
    expect(pageSlice(ALL, 2, 9)).toMatchObject({ page: 1 });
    expect(pageSlice(ALL, 2, 3).items).toHaveLength(2);
  });
});

describe('giờ VN', () => {
  it('chuyển qua lại ISO ↔ ngày/giờ VN', () => {
    expect(vnToIso('2026-10-22', '19:30')).toBe('2026-10-22T12:30:00.000Z');
    expect(vnDateOf('2026-10-21T17:30:00.000Z')).toBe('2026-10-22');
    expect(daysAgo('2026-10-15T08:30:00.000Z', Date.UTC(2026, 9, 16, 8, 30))).toBe(1);
  });
});

describe('form', () => {
  it('BUG-022 validateEvent trả mọi lỗi (thứ tự ô theo prototype)', () => {
    const f = emptyEventForm();
    const all = validateEvent(f);
    expect(all).toEqual({ title: 'title', date: 'date', place: 'place', address: 'address' });
    expect(Object.keys(all)).toEqual(['title', 'date', 'place', 'address']);
    expect(validateEvent({ ...f, mode: 'online' })).toEqual({
      title: 'title',
      date: 'date',
      place: 'link',
    });
  });
  it('kiểm từng ô: tên ngắn, link bản đồ', () => {
    const f = emptyEventForm();
    expect(validateEvent({ ...f, title: 'Me' }).title).toBe('titleShort');
    const dated = { ...f, title: 'Meetup', date: '2026-11-20' };
    expect(validateEvent({ ...dated, place: 'Hub' })).toEqual({ address: 'address' });
    const full = { ...dated, place: 'Hub', address: '1 Lê Lợi' };
    expect(validateEvent({ ...full, mapUrl: 'maps.app' })).toEqual({ map: 'map' });
    expect(validateEvent(full)).toEqual({});
  });
  it('sửa: để trống ngày thì giữ ngày cũ; online bỏ địa chỉ + bản đồ', () => {
    const f = formFromEvent(ev('e1', 'offline', 80, 54, 'OPC Meetup #12'));
    expect(f.date).toBe('');
    expect(validateEvent(f)).toEqual({});
    const body = formToUpsert({ ...f, start: '20:00' }, 'mặc định');
    expect(body.startsAt).toBe('2026-10-22T13:00:00.000Z');
    expect(body.description).toBe('mặc định');
    const online = formToUpsert({ ...f, mode: 'online', mapUrl: 'https://x.y' }, '');
    expect(online.address).toBeUndefined();
    expect(online.mapUrl).toBeNull();
  });
  it('EV-R01 REQ-341 link Meet: https mới hợp lệ, rỗng → null, giữ khi sửa', () => {
    const f = { ...formFromEvent(ev('e1', 'offline', 80, 54, 'OPC Meetup #12')) };
    expect(validateEvent({ ...f, meet: 'meet.google.com/abc' })).toEqual({ meet: 'meet' });
    expect(validateEvent({ ...f, meet: 'http://meet.google.com/abc' })).toEqual({ meet: 'meet' });
    const url = 'https://meet.google.com/abc-defg-hij';
    expect(validateEvent({ ...f, meet: url })).toEqual({});
    expect(formToUpsert({ ...f, meet: ` ${url} ` }, '').meetUrl).toBe(url);
    expect(formToUpsert({ ...f, meet: '' }, '').meetUrl).toBeNull();
    expect(formFromEvent({ ...ev('e2', 'online', 1, 0), meetUrl: url }).meet).toBe(url);
    expect(meetShort(url)).toBe('meet.google.com/abc-defg-hij');
  });
  it('EV-R02 REQ-342 nhãn ngày: Hôm nay / Ngày mai / Còn N ngày', () => {
    expect(inDaysKey(0)).toEqual({ k: 'today' });
    expect(inDaysKey(1)).toEqual({ k: 'tomorrow' });
    expect(inDaysKey(6)).toEqual({ k: 'inDays', n: 6 });
  });
});
