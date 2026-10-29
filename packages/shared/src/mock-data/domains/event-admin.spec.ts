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
import { listEvents, setRegistration } from './ops-content';
import { registrationState } from './registration/state';
import { eventBridgeCookie, syncEventBridge } from './events-bridge';
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

  it('hiển thị thành viên mới đăng ký từ Portal kể cả không có trong members.json', () => {
    // Giả lập tài khoản mới tạo từ luồng đăng ký Portal
    registrationState().profiles.set('u-newbie-1', {
      id: 'u-newbie-1',
      accountType: 'business',
      fullName: 'Hoàng Văn An',
      email: 'an.hoang@example.com',
      phone: '0901234567',
      country: 'vn',
      organization: 'Công ty Công nghệ An Bình',
      persona: 'Doanh nghiệp',
      status: 'active',
      createdAt: '2026-10-20T00:00:00Z',
      groupIds: ['c1'],
      business: {
        companyName: 'Công ty Công nghệ An Bình',
        taxCode: '0123456789',
        field: 'Công nghệ thông tin',
        size: '1-10',
        country: 'vn',
        position: 'Giám đốc',
        verification: 'verified',
      },
      onboarding: { done: 8, missing: [], reminded: false },
    });

    const reg = setRegistration('u-newbie-1', 'e3', true);
    expect(reg.ok).toBe(true);

    const list = listEventRegistrants('e3');
    expect(list.ok).toBe(true);
    if (!list.ok) return;

    const newbie = list.data.find((r) => r.userId === 'u-newbie-1');
    expect(newbie).toBeDefined();
    expect(newbie).toMatchObject({
      userId: 'u-newbie-1',
      fullName: 'Hoàng Văn An',
      email: 'an.hoang@example.com',
      phone: '0901234567',
      org: 'Công ty Công nghệ An Bình',
      status: 'registered',
    });
  });

  it('sự kiện tạo mới: ban đầu danh sách rỗng, có người đăng ký hiển thị đúng người đó', () => {
    const created = saveAdminEvent('admin', {
      title: 'Hội thảo OPC 2026',
      mode: 'online',
      startsAt: '2026-11-25T14:00:00.000Z',
      place: 'Zoom',
      address: undefined,
      seats: 50,
      description: 'Mô tả',
      endTime: '16:00',
      mapUrl: null,
      groupId: null,
      registrationOpen: true,
      coverUrl: null,
      meetUrl: 'https://meet.google.com/xyz-uvwx-rst',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const evId = created.data.id;

    // Ban đầu chưa ai đăng ký -> danh sách rỗng
    const before = listEventRegistrants(evId);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.data).toEqual([]);

    // Thành viên đăng ký
    expect(setRegistration('m2', evId, true).ok).toBe(true);
    const after = listEventRegistrants(evId);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.data).toHaveLength(1);
    expect(after.data[0]).toMatchObject({
      userId: 'm2',
      fullName: 'Lê Minh Anh',
      status: 'registered',
    });
  });

  it('cầu cookie syncEventBridge đồng bộ đăng ký sự kiện giữa Portal và Admin', () => {
    const c1 = eventBridgeCookie(undefined, {
      eventId: 'e4',
      userId: 'u-custom-99',
      registered: true,
      at: '2026-10-29T00:00:00.000Z',
      fullName: 'Trịnh Thảo',
      email: 'thao@example.com',
      phone: '0988776655',
      org: 'OPC Studio',
    });

    const cookieRaw = c1.split(';')[0]?.split('=')[1];
    syncEventBridge(cookieRaw);

    const list = listEventRegistrants('e4');
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    const found = list.data.find((r) => r.userId === 'u-custom-99');
    expect(found).toMatchObject({
      userId: 'u-custom-99',
      fullName: 'Trịnh Thảo',
      email: 'thao@example.com',
      phone: '0988776655',
      org: 'OPC Studio',
      status: 'registered',
    });
  });
});
