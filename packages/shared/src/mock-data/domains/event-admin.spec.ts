import { beforeEach, describe, expect, it } from 'vitest';
import {
  adminUpcoming,
  checkInRegistrants,
  exportEventRegistrants,
  listAdminEvents,
  listEventRegistrants,
  removeAdminEvent,
  saveAdminEvent,
} from './event-admin';
import { auditLog } from './group-admin';
import { listEvents } from './ops-content';
import { resetMockDb } from './store';

beforeEach(() => resetMockDb());

describe('mock Admin sự kiện', () => {
  it('danh sách có trường mở rộng mặc định', () => {
    const e1 = listAdminEvents().find((e) => e.id === 'e1');
    expect(e1).toMatchObject({ registrationOpen: true, groupId: null, registered: 54 });
  });

  it('tạo / sửa / xoá đều ghi audit', () => {
    const r = saveAdminEvent('admin', {
      title: 'OPC Meetup #13',
      mode: 'offline',
      startsAt: '2026-11-20T12:00:00.000Z',
      place: 'Hub',
      address: '1 Lê Lợi',
      seats: 40,
      description: 'x',
      endTime: '21:00',
      mapUrl: null,
      groupId: 'c1',
      registrationOpen: false,
      coverUrl: null,
      meetUrl: 'https://meet.google.com/abc-defg-hij',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ day: 'T6, 20/11', time: '19:00', registrationOpen: false });
    expect(removeAdminEvent('admin', r.data.id).ok).toBe(true);
    expect(auditLog().map((a) => a.action)).toEqual(['event.delete', 'event.create']);
  });

  it('người đăng ký mẫu (≤ 7) + check-in một người / tất cả', () => {
    const list = listEventRegistrants('e1');
    expect(list.ok && list.data.map((r) => r.fullName).slice(0, 2)).toEqual([
      'Trần Quốc Bảo',
      'Lê Minh Anh',
    ]);
    if (!list.ok) return;
    expect(list.data).toHaveLength(7);
    const one = checkInRegistrants('admin', 'e1', ['m3'], true);
    expect(one.ok && one.data.items.filter((r) => r.status === 'attended')).toHaveLength(1);
    // REQ-345 EV-R05: "Đã check-in 1/7"
    expect(one.ok && [one.data.checkedIn, one.data.total]).toEqual([1, 7]);
    const all = checkInRegistrants(
      'admin',
      'e1',
      list.data.map((r) => r.userId),
      true,
    );
    expect(all.ok && all.data.items.every((r) => r.status === 'attended')).toBe(true);
    expect(all.ok && all.data.checkedIn).toBe(7);
    expect(auditLog()[0]?.action).toBe('event.check_in');
  });

  it('AT-EV01 REQ-344 link Meet chỉ cho người đã đăng ký; Admin luôn thấy', () => {
    const e3 = listEvents('m1').find((e) => e.id === 'e3');
    const e2 = listEvents('m1').find((e) => e.id === 'e2');
    // TK demo m1 đăng ký e2, chưa đăng ký e3
    expect(e2?.registeredByMe && e2.meetUrl).toMatch(/^https:\/\/meet\.google\.com\//);
    expect(e3?.meetUrl).toBeNull();
    expect(listAdminEvents().find((e) => e.id === 'e3')?.meetUrl).toMatch(/^https:/);
  });

  it('REQ-342 Sắp diễn ra: gần nhất + 3 tiếp theo, bỏ sự kiện đã đóng', () => {
    const now = Date.parse('2026-10-16T08:30:00Z');
    const u = adminUpcoming(now);
    expect(u.next?.id).toBe('e1');
    expect(u.more.map((e) => e.id)).toEqual(['e2', 'e3', 'e4']);
    const e1 = listAdminEvents().find((e) => e.id === 'e1');
    if (!e1) return;
    saveAdminEvent(
      'admin',
      {
        title: e1.title,
        mode: e1.mode,
        startsAt: e1.startsAt,
        place: e1.place,
        seats: e1.seats,
        description: e1.description,
        endTime: null,
        mapUrl: null,
        groupId: null,
        registrationOpen: false,
        coverUrl: null,
        meetUrl: null,
      },
      'e1',
    );
    expect(adminUpcoming(now).next?.id).toBe('e2');
  });

  it('xuất CSV ghi audit (dữ liệu cá nhân)', () => {
    const r = exportEventRegistrants('admin', 'e2');
    // 7 người mẫu + TK demo đã đăng ký e2 + dòng tiêu đề
    expect(r.ok && r.data.csv.split('\n')).toHaveLength(9);
    expect(auditLog()[0]?.action).toBe('event.registrants_export');
    expect(exportEventRegistrants('admin', 'nope').ok).toBe(false);
  });
});
