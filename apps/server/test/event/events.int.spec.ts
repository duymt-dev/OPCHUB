import { pageSchema } from '@opchub/shared/api';
import { eventItemSchema, eventRegistrationResultSchema } from '@opchub/shared/api-domains';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotificationEventsHandler } from '@/modules/notification';
import { createEvent, removeTestEvents } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const errorOf = async (r: Response) =>
  ((await r.json()) as { error: { code: string; message: string } }).error;

describe('Sự kiện Portal (B31)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await removeTestEvents(t);
    await t.close();
  });

  const member = async () => tokenOf(t, await createUser(t, { fee: 'active' }));
  const reg = (tk: string, id: string, method: 'POST' | 'DELETE') =>
    t.call(`/events/${id}/registration`, { method, token: tk });

  it('danh sách: day/time giờ VN, registeredByMe, lọc mode', async () => {
    const ev = await createEvent(t, { startsAt: new Date(Date.UTC(2030, 9, 22, 12, 30)) });
    const tk = await member();
    await reg(tk, ev.id, 'POST');
    const page = pageSchema(eventItemSchema).parse(
      await (await t.call('/events?mode=offline&size=100', { token: tk })).json(),
    );
    const item = page.items.find((i) => i.id === ev.id);
    // 22/10/2030 12:30 UTC = 19:30 thứ Ba giờ VN
    expect(item).toMatchObject({ day: 'T3, 22/10', time: '19:30', registeredByMe: true });
    expect(page.items.every((i) => i.mode === 'offline')).toBe(true);
    const online = pageSchema(eventItemSchema).parse(
      await (await t.call('/events?mode=online&size=100', { token: tk })).json(),
    );
    expect(online.items.some((i) => i.id === ev.id)).toBe(false);
  });

  it('đăng ký → +1 + outbox → thông báo; lần 2 → 409; huỷ → -1; huỷ lại → 409', async () => {
    const ev = await createEvent(t, { seats: 5 });
    const u = await createUser(t, { fee: 'active' });
    const tk = await tokenOf(t, u);
    const r1 = await reg(tk, ev.id, 'POST');
    expect(r1.status).toBe(201);
    expect(eventRegistrationResultSchema.parse(await r1.json())).toEqual({
      eventId: ev.id,
      registered: 1,
      registeredByMe: true,
    });
    expect((await errorOf(await reg(tk, ev.id, 'POST'))).message).toBe(
      'Bạn đã đăng ký sự kiện này',
    );

    const out = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: { type: 'event.registered', payload: { path: ['eventId'], equals: ev.id } },
      select: { payload: true },
    });
    await t.app
      .get(NotificationEventsHandler)
      .eventRegistered(parseOutboxPayload('event.registered', out.payload));
    const box = (await (await t.call('/notifications', { token: tk })).json()) as {
      items: { title: string; type: string; link: string }[];
    };
    expect(box.items[0]).toMatchObject({
      type: 'event',
      title: `Đã đăng ký: ${ev.title}`,
      link: `/events/${ev.id}`,
    });

    const r2 = await reg(tk, ev.id, 'DELETE');
    expect(eventRegistrationResultSchema.parse(await r2.json()).registered).toBe(0);
    expect((await errorOf(await reg(tk, ev.id, 'DELETE'))).message).toBe(
      'Bạn chưa đăng ký sự kiện này',
    );
    // Đăng ký lại sau khi huỷ dùng lại dòng cũ
    expect((await reg(tk, ev.id, 'POST')).status).toBe(201);
  });

  it('đóng đăng ký → 409; không tồn tại → 404', async () => {
    const ev = await createEvent(t, { registrationOpen: false });
    const tk = await member();
    expect((await errorOf(await reg(tk, ev.id, 'POST'))).message).toBe('Sự kiện đã đóng đăng ký');
    expect((await reg(tk, '00000000-0000-0000-0000-000000000000', 'POST')).status).toBe(404);
  });

  it('tranh chỗ cuối song song: đúng 1 người được, số đăng ký không vượt số chỗ', async () => {
    const ev = await createEvent(t, { seats: 1 });
    const tokens = await Promise.all([member(), member(), member(), member()]);
    const res = await Promise.all(tokens.map((tk) => reg(tk, ev.id, 'POST')));
    expect(res.filter((r) => r.status === 201)).toHaveLength(1);
    const failed = res.filter((r) => r.status === 409);
    expect(failed).toHaveLength(3);
    expect((await errorOf(failed[0] as Response)).message).toBe('Sự kiện đã hết chỗ');
    const row = await t.prisma.db.event.findUniqueOrThrow({
      where: { id: ev.id },
      select: { registeredCount: true },
    });
    expect(row.registeredCount).toBe(1);
  });

  it('chưa đóng phí → 402', async () => {
    const ev = await createEvent(t);
    const tk = await tokenOf(t, await createUser(t, { fee: null }));
    expect((await reg(tk, ev.id, 'POST')).status).toBe(402);
  });
});
