import { pageSchema } from '@opchub/shared/api';
import {
  adminEventSchema,
  eventRegistrantSchema,
  eventRegistrantsExportSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEvent, removeTestEvents, TEST_EVENT_PREFIX } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const registrantList = pageSchema(eventRegistrantSchema);

describe('Admin sự kiện (B31)', () => {
  let t: TestApp;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await removeTestEvents(t);
    await t.close();
  });

  const body = {
    title: `${TEST_EVENT_PREFIX} Webinar Thuế cuối năm`,
    mode: 'offline' as const,
    startsAt: '2030-11-20T12:00:00.000Z',
    place: 'Hà Nội',
    address: '18 Tam Trinh',
    seats: 50,
    description: 'Mô tả',
    endTime: '21:30',
    mapUrl: 'https://maps.example/x',
    registrationOpen: true,
  };

  it('tạo 201 (day/time VN, endTime) → sửa → audit; giảm chỗ dưới số đăng ký → 409', async () => {
    const r = await t.call('/admin/events', { method: 'POST', token: admin, json: body });
    expect(r.status).toBe(201);
    const ev = adminEventSchema.parse(await r.json());
    expect(ev).toMatchObject({ day: 'T4, 20/11', time: '19:00', endTime: '21:30', registered: 0 });

    const patched = adminEventSchema.parse(
      await (
        await t.call(`/admin/events/${ev.id}`, {
          method: 'PATCH',
          token: admin,
          json: { ...body, registrationOpen: false, mode: 'online', place: 'https://zoom.us/j/1' },
        })
      ).json(),
    );
    // Online: bỏ địa chỉ / bản đồ
    expect(patched).toMatchObject({ registrationOpen: false, address: null, mapUrl: null });

    const tk = await tokenOf(t, await createUser(t, { fee: 'active' }));
    await t.prisma.db.event.update({ where: { id: ev.id }, data: { registrationOpen: true } });
    await t.call(`/events/${ev.id}/registration`, { method: 'POST', token: tk });
    const low = await t.call(`/admin/events/${ev.id}`, {
      method: 'PATCH',
      token: admin,
      json: { ...body, seats: 1 },
    });
    expect(low.status).toBe(200);
    await t.prisma.db.event.update({ where: { id: ev.id }, data: { registeredCount: 5 } });
    const tooLow = await t.call(`/admin/events/${ev.id}`, {
      method: 'PATCH',
      token: admin,
      json: { ...body, seats: 2 },
    });
    expect(tooLow.status).toBe(409);

    const logs = await t.prisma.db.auditLog.findMany({
      where: { entityId: ev.id },
      select: { action: true, tag: true },
    });
    expect(logs.map((l) => l.action).sort()).toEqual([
      'event.create',
      'event.update',
      'event.update',
    ]);
    expect(logs.every((l) => l.tag === 'content')).toBe(true);
  });

  it('ảnh bìa ngoài storage → 400; nhóm không tồn tại → 400', async () => {
    const bad = await t.call('/admin/events', {
      method: 'POST',
      token: admin,
      json: { ...body, coverUrl: 'https://evil.example/a.png' },
    });
    expect(bad.status).toBe(400);
    const noGroup = await t.call('/admin/events', {
      method: 'POST',
      token: admin,
      json: { ...body, groupId: 'khong-co' },
    });
    expect(noGroup.status).toBe(400);
  });

  it('danh sách đăng ký → check-in một / tất cả / bỏ → export CSV + audit', async () => {
    const ev = await createEvent(t, { seats: 10 });
    const users = await Promise.all([1, 2, 3].map(() => createUser(t, { fee: 'active' })));
    for (const u of users) {
      await t.call(`/events/${ev.id}/registration`, { method: 'POST', token: await tokenOf(t, u) });
    }
    const list = registrantList.parse(
      await (
        await t.call(`/admin/events/${ev.id}/registrations?size=100`, { token: admin })
      ).json(),
    );
    expect(list.total).toBe(3);
    expect(list.items[0]).toMatchObject({ org: 'Thành viên OPC', status: 'registered' });

    const check = async (userIds: string[], attended: boolean) =>
      (
        (await (
          await t.call(`/admin/events/${ev.id}/registrations/check-in`, {
            method: 'POST',
            token: admin,
            json: { userIds, attended },
          })
        ).json()) as { items: { status: string }[] }
      ).items.filter((i) => i.status === 'attended').length;
    const ids = users.map((u) => u.id);
    expect(await check([ids[0] ?? ''], true)).toBe(1);
    expect(await check([ids[0] ?? ''], false)).toBe(0);
    expect(await check(ids, true)).toBe(3);

    const exp = eventRegistrantsExportSchema.parse(
      await (
        await t.call(`/admin/events/${ev.id}/registrations/export`, {
          method: 'POST',
          token: admin,
        })
      ).json(),
    );
    expect(exp.filename).toBe(`dang-ky-${ev.id}.csv`);
    expect(exp.csv.charCodeAt(0)).toBe(0xfeff);
    expect(exp.csv).toContain('"Đã check-in"');
    expect(exp.csv.split('\n')).toHaveLength(4);
    const actions = await t.prisma.db.auditLog.findMany({
      where: { entityId: ev.id },
      select: { action: true },
    });
    expect(actions.map((a) => a.action)).toContain('event.registrants_export');
  });

  it('BUG-041 EV-R05 cancelled → attended bị bỏ qua; bỏ check-in sau khi kết thúc → 409', async () => {
    const ev = await createEvent(t, { seats: 10 });
    const u = await createUser(t, { fee: 'active' });
    await t.prisma.db.eventRegistration.create({
      data: { eventId: ev.id, userId: u.id, status: 'cancelled' },
    });
    const r = await t.call(`/admin/events/${ev.id}/registrations/check-in`, {
      method: 'POST',
      token: admin,
      json: { userIds: [u.id], attended: true },
    });
    expect(r.status).toBe(200);
    const row = await t.prisma.db.eventRegistration.findUniqueOrThrow({
      where: { eventId_userId: { eventId: ev.id, userId: u.id } },
      select: { status: true },
    });
    expect(row.status).toBe('cancelled');

    const ended = await createEvent(t, { startsAt: new Date(Date.now() - 3 * 86_400_000) });
    await t.prisma.db.eventRegistration.create({
      data: { eventId: ended.id, userId: u.id, status: 'attended', checkedInAt: new Date() },
    });
    const undo = await t.call(`/admin/events/${ended.id}/registrations/check-in`, {
      method: 'POST',
      token: admin,
      json: { userIds: [u.id], attended: false },
    });
    expect(undo.status).toBe(409);
  });

  it('điều phối viên (e.reg) xem được, không sửa được; thành viên 403', async () => {
    const mod = await tokenOf(t, await createUser(t, { systemRole: 'moderator' }));
    expect((await t.call('/admin/events', { token: mod })).status).toBe(200);
    expect((await t.call('/admin/events', { method: 'POST', token: mod, json: body })).status).toBe(
      403,
    );
    const m = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call('/admin/events', { token: m })).status).toBe(403);
  });

  it('xoá → 200 + audit; xoá lại → 404', async () => {
    const ev = await createEvent(t);
    expect(
      (await t.call(`/admin/events/${ev.id}`, { method: 'DELETE', token: admin })).status,
    ).toBe(200);
    expect(
      (await t.call(`/admin/events/${ev.id}`, { method: 'DELETE', token: admin })).status,
    ).toBe(404);
  });
});
