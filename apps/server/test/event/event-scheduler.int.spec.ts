import { adminUpcomingSchema, eventCheckInResultSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EventSchedulerService } from '@/modules/event';
import { EventMailHandler } from '@/modules/mail';
import { NotificationEventsHandler } from '@/modules/notification';
import { createEvent, removeTestEvents } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const HOUR = 3_600_000;
const MEET = 'https://meet.google.com/abc-defg-hij';

/** TIP-V2-303 — NA-23 scheduler 15', EV-R01 Meet, EV-R02 Sắp diễn ra, REQ-223/341/342/345 */
describe('Sự kiện: scheduler + Meet + Sắp diễn ra (TIP-V2-303)', () => {
  let t: TestApp;
  let sched: EventSchedulerService;
  let admin: string;
  beforeAll(async () => {
    t = await createTestApp();
    sched = t.app.get(EventSchedulerService);
  });
  beforeEach(async () => {
    await removeTestEvents(t);
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await removeTestEvents(t);
    await t.close();
  });

  const at = (ms: number) => new Date(Date.now() + ms);
  const eventOf = (id: string) =>
    t.prisma.db.event.findUniqueOrThrow({
      where: { id },
      select: { registrationOpen: true, closedAt: true, remindedAt: true },
    });
  const reg = async (eventId: string) => {
    const u = await createUser(t, { fee: 'active' });
    const tk = await tokenOf(t, u);
    const r = await t.call(`/events/${eventId}/registration`, { method: 'POST', token: tk });
    expect(r.status).toBe(201);
    return { u, tk };
  };
  const upsertOf = async (id: string) => {
    const row = await t.prisma.db.event.findUniqueOrThrow({ where: { id } });
    return {
      title: row.title,
      mode: row.mode,
      startsAt: row.startsAt.toISOString(),
      place: row.place,
      ...(row.address ? { address: row.address } : {}),
      seats: row.seats,
      description: 'Mô tả',
      registrationOpen: row.registrationOpen,
    };
  };

  it('REQ-223 NA-23 hết chỗ → tự đóng đăng ký; huỷ trả chỗ → mở lại', async () => {
    const ev = await createEvent(t, { seats: 1, startsAt: at(72 * HOUR) });
    const { tk } = await reg(ev.id);
    expect((await sched.sweep()).closed).toBeGreaterThanOrEqual(1);
    const closed = await eventOf(ev.id);
    expect(closed.registrationOpen).toBe(false);
    expect(closed.closedAt).not.toBeNull();
    await t.call(`/events/${ev.id}/registration`, { method: 'DELETE', token: tk });
    expect(await eventOf(ev.id)).toMatchObject({ registrationOpen: true, closedAt: null });
  });

  it('REQ-223 tới giờ bắt đầu → đóng; Admin tự đóng (closed_at null) giữ nguyên', async () => {
    const started = await createEvent(t, { seats: 10, startsAt: at(-HOUR) });
    const manual = await createEvent(t, {
      seats: 1,
      startsAt: at(72 * HOUR),
      registrationOpen: false,
    });
    await sched.sweep();
    expect((await eventOf(started.id)).registrationOpen).toBe(false);
    expect(await eventOf(manual.id)).toMatchObject({ registrationOpen: false, closedAt: null });
  });

  it('REQ-223 NA-23 nhắc 24h: 1 outbox / sự kiện, chạy lại không trùng; mail + thông báo có link Meet', async () => {
    const soon = await createEvent(t, { seats: 10, mode: 'online', startsAt: at(23 * HOUR) });
    const later = await createEvent(t, { seats: 10, startsAt: at(30 * HOUR) });
    await t.prisma.db.event.update({ where: { id: soon.id }, data: { meetUrl: MEET } });
    const a = await reg(soon.id);
    const b = await reg(soon.id);
    await reg(later.id);

    await sched.sweep();
    await sched.sweep();
    const out = await t.prisma.db.outboxEvent.findMany({
      where: { type: 'event.reminder_due', payload: { path: ['eventId'], equals: soon.id } },
      select: { payload: true },
    });
    expect(out).toHaveLength(1);
    expect((await eventOf(later.id)).remindedAt).toBeNull();

    const p = parseOutboxPayload('event.reminder_due', out[0]?.payload);
    const mail = t.app.get(EventMailHandler);
    await mail.reminder(p);
    await mail.reminder(p);
    const mails = await t.prisma.db.mailLog.findMany({
      where: {
        to: { in: [a.u.email, b.u.email] },
        kind: 'event',
        subject: { startsWith: 'Nhắc lịch' },
      },
      select: { bodyHtml: true },
    });
    expect(mails).toHaveLength(2);
    expect(mails[0]?.bodyHtml).toContain(MEET);

    await t.app.get(NotificationEventsHandler).eventReminder(p);
    const box = (await (await t.call('/notifications', { token: a.tk })).json()) as {
      items: { title: string; body: string }[];
    };
    expect(box.items[0]?.title).toBe(`Sắp diễn ra: ${soon.title}`);
    expect(box.items[0]?.body).toContain('Link phòng họp: meet.google.com/abc-defg-hij');
  });

  it('REQ-223 đổi giờ bắt đầu → nhắc lại theo giờ mới', async () => {
    const ev = await createEvent(t, { seats: 10, startsAt: at(20 * HOUR) });
    await sched.sweep();
    expect((await eventOf(ev.id)).remindedAt).not.toBeNull();
    const r = await t.call(`/admin/events/${ev.id}`, {
      method: 'PATCH',
      token: admin,
      json: { ...(await upsertOf(ev.id)), startsAt: at(72 * HOUR).toISOString() },
    });
    expect(r.status).toBe(200);
    expect((await eventOf(ev.id)).remindedAt).toBeNull();
  });

  it('EV-R01 REQ-341 REQ-344 AT-EV01 Meet: lưu https, sai → 400; chỉ người đã đăng ký thấy link', async () => {
    const ev = await createEvent(t, { seats: 10, mode: 'online', startsAt: at(72 * HOUR) });
    const body = { ...(await upsertOf(ev.id)), place: 'Google Meet' };
    const bad = await t.call(`/admin/events/${ev.id}`, {
      method: 'PATCH',
      token: admin,
      json: { ...body, meetUrl: 'meet.google.com/x' },
    });
    expect(bad.status).toBe(400);
    const ok = await t.call(`/admin/events/${ev.id}`, {
      method: 'PATCH',
      token: admin,
      json: { ...body, meetUrl: MEET },
    });
    expect(((await ok.json()) as { meetUrl: string }).meetUrl).toBe(MEET);

    const itemOf = async (tk: string) =>
      (
        (await (await t.call('/events?size=100', { token: tk })).json()) as {
          items: { id: string; meetUrl: string | null }[];
        }
      ).items.find((i) => i.id === ev.id);
    const outsider = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await itemOf(outsider))?.meetUrl).toBeNull();
    const { tk } = await reg(ev.id);
    expect((await itemOf(tk))?.meetUrl).toBe(MEET);
  });

  it('EV-R02 REQ-342 Sắp diễn ra: gần nhất + ≤3 tiếp theo, bỏ sự kiện đóng; RB-R05 chỉ xem được', async () => {
    const ids: string[] = [];
    for (const h of [1, 26, 74, 98, 200]) {
      ids.push((await createEvent(t, { seats: 10, startsAt: at(h * HOUR) })).id);
    }
    const closed = await createEvent(t, {
      seats: 10,
      startsAt: at(2 * HOUR),
      registrationOpen: false,
    });
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['events.view'] }));
    const r = await t.call('/admin/events/upcoming', { token: viewer });
    expect(r.status).toBe(200);
    const up = adminUpcomingSchema.parse(await r.json());
    // Dữ liệu seed có thể có sự kiện thật gần hơn — chỉ so thứ tự các sự kiện test
    const mine = [up.next?.id, ...up.more.map((x) => x.id)].filter((x) => x && ids.includes(x));
    expect(mine).toEqual(ids.slice(0, mine.length));
    expect(up.more.length).toBeLessThanOrEqual(3);
    expect([up.next?.id, ...up.more.map((x) => x.id)]).not.toContain(closed.id);
    expect(up.next?.inDays).toBeGreaterThanOrEqual(0);
    const member = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call('/admin/events/upcoming', { token: member })).status).toBe(403);
  });

  it('AT-EV02 REQ-344 đăng ký → mail xác nhận + thông báo có link phòng họp', async () => {
    const ev = await createEvent(t, { seats: 10, mode: 'online', startsAt: at(72 * HOUR) });
    await t.prisma.db.event.update({ where: { id: ev.id }, data: { meetUrl: MEET } });
    const { u, tk } = await reg(ev.id);
    const p = { eventId: ev.id, userId: u.id };
    await t.app.get(EventMailHandler).registered(p);
    await t.app.get(NotificationEventsHandler).eventRegistered(p);
    const mail = await t.prisma.db.mailLog.findFirstOrThrow({
      where: { to: u.email, kind: 'event' },
      select: { subject: true, bodyHtml: true },
    });
    expect(mail.subject).toContain('Xác nhận đăng ký');
    expect(mail.bodyHtml).toContain(`Link phòng họp: <a href="${MEET}">`);
    const box = (await (await t.call('/notifications', { token: tk })).json()) as {
      items: { body: string }[];
    };
    expect(box.items[0]?.body).toMatch(/^Link phòng họp: meet\.google\.com\/abc-defg-hij · /);
  });

  it('REQ-345 check-in trả "Đã check-in x/y"; chỉ events.view → 403', async () => {
    const ev = await createEvent(t, { seats: 10, startsAt: at(72 * HOUR) });
    const a = await reg(ev.id);
    await reg(ev.id);
    const r = await t.call(`/admin/events/${ev.id}/registrations/check-in`, {
      method: 'POST',
      token: admin,
      json: { userIds: [a.u.id], attended: true },
    });
    const viewer = await tokenOf(t, await createUser(t, { adminPermissions: ['events.view'] }));
    const denied = await t.call(`/admin/events/${ev.id}/registrations/check-in`, {
      method: 'POST',
      token: viewer,
      json: { userIds: [a.u.id], attended: true },
    });
    expect(denied.status).toBe(403);
    expect(eventCheckInResultSchema.parse(await r.json())).toMatchObject({
      checkedIn: 1,
      total: 2,
    });
  });
});
