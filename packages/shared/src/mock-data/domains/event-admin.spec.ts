import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkInRegistrants,
  exportEventRegistrants,
  listAdminEvents,
  listEventRegistrants,
  removeAdminEvent,
  saveAdminEvent,
} from './event-admin';
import { auditLog } from './group-admin';
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
    expect(one.ok && one.data.filter((r) => r.status === 'attended')).toHaveLength(1);
    const all = checkInRegistrants(
      'admin',
      'e1',
      list.data.map((r) => r.userId),
      true,
    );
    expect(all.ok && all.data.every((r) => r.status === 'attended')).toBe(true);
    expect(auditLog()[0]?.action).toBe('event.check_in');
  });

  it('xuất CSV ghi audit (dữ liệu cá nhân)', () => {
    const r = exportEventRegistrants('admin', 'e2');
    // 7 người mẫu + TK demo đã đăng ký e2 + dòng tiêu đề
    expect(r.ok && r.data.csv.split('\n')).toHaveLength(9);
    expect(auditLog()[0]?.action).toBe('event.registrants_export');
    expect(exportEventRegistrants('admin', 'nope').ok).toBe(false);
  });
});
