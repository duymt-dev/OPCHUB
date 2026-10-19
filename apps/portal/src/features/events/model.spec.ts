import type { EventItem } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { countdown, filterEvents, regStateOf, toEventView } from './model';

const ev = (o: Partial<EventItem>): EventItem => ({
  id: 'e1',
  title: 'OPC Meetup #12',
  mode: 'offline',
  day: 'T5, 22/10',
  time: '19:30',
  place: 'MediaSoft Hub, Hà Nội',
  seats: 80,
  registered: 54,
  description: '',
  startsAt: '2026-10-22T12:30:00.000Z',
  address: null,
  registeredByMe: false,
  coverUrl: null,
  avatars: [],
  ...o,
});

describe('events/model', () => {
  it('trạng thái nút: đã đăng ký > hết chỗ > còn chỗ', () => {
    expect(regStateOf(ev({ registeredByMe: true, registered: 80 }))).toBe('registered');
    expect(regStateOf(ev({ registered: 120, seats: 120 }))).toBe('full');
    expect(regStateOf(ev({}))).toBe('open');
  });

  it('số chỗ + phần trăm', () => {
    expect(toEventView(ev({}), 0)).toMatchObject({ regText: '54/80', pct: 68 });
    expect(toEventView(ev({ registered: 130, seats: 120 }), 0).pct).toBe(100);
  });

  it('lọc theo chip + tìm tên/địa điểm', () => {
    const all = [
      ev({ id: 'a' }),
      ev({ id: 'b', mode: 'online', place: 'Zoom', registeredByMe: true }),
    ].map(toEventView);
    expect(filterEvents(all, { q: '', filter: 'mine' }).map((e) => e.id)).toEqual(['b']);
    expect(filterEvents(all, { q: '', filter: 'offline' }).map((e) => e.id)).toEqual(['a']);
    expect(filterEvents(all, { q: 'zoom', filter: 'all' }).map((e) => e.id)).toEqual(['b']);
    expect(filterEvents(all, { q: 'zzzz', filter: 'all' })).toHaveLength(0);
  });

  it('đếm ngược: ngày/giờ/phút/giây, đã qua → 00', () => {
    const now = Date.parse('2026-10-16T02:00:00.000Z');
    expect(countdown('2026-10-22T12:30:00.000Z', now)).toEqual({
      days: '06',
      hours: '10',
      minutes: '30',
      seconds: '00',
    });
    expect(countdown('2026-10-01T00:00:00.000Z', now).days).toBe('00');
  });
});
