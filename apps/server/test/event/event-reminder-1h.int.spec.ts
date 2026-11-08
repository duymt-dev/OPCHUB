import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseOutboxPayload } from '@opchub/shared/outbox';
import { EventSchedulerService } from '@/modules/event';
import { NotificationEventsHandler } from '@/modules/notification';
import { createUser } from '../factories/user.factory';
import { createEvent } from '../factories/event.factory';
import { clearPushFixtures, pushTestApp, setPushSettings } from '../notification/push-test.helpers';

describe('D-137 one-hour event reminder', () => {
  let f: Awaited<ReturnType<typeof pushTestApp>>;
  const users: string[] = [],
    events: string[] = [];
  beforeAll(async () => {
    f = await pushTestApp();
  });
  afterAll(async () => {
    if (!f) return;
    await clearPushFixtures(f.t, users);
    await f.t.prisma.db.outboxEvent.deleteMany({
      where: {
        type: 'event.reminder_due',
        OR: events.map((id) => ({ payload: { path: ['eventId'], equals: id } })),
      },
    });
    await f.t.prisma.db.event.deleteMany({ where: { id: { in: events } } });
    await setPushSettings(f.t, f.previous);
    await f.t.close();
  });
  it('claims the 1h window once, never catches up 24h for late-created events and parses legacy payloads', async () => {
    const now = new Date(),
      u = await createUser(f.t, { fee: 'active' });
    users.push(u.id);
    const ev = await createEvent(f.t, { startsAt: new Date(now.getTime() + 50 * 60000) });
    events.push(ev.id);
    await f.t.prisma.db.eventRegistration.create({ data: { eventId: ev.id, userId: u.id } });
    await f.t.app.get(EventSchedulerService).sweep(now);
    await f.t.app.get(EventSchedulerService).sweep(now);
    const out = await f.t.prisma.db.outboxEvent.findMany({
      where: { type: 'event.reminder_due', payload: { path: ['eventId'], equals: ev.id } },
      select: { payload: true },
    });
    expect(out).toHaveLength(1);
    const p = parseOutboxPayload('event.reminder_due', out[0]?.payload);
    expect(p.window).toBe('1h');
    expect(parseOutboxPayload('event.reminder_due', { eventId: ev.id }).window).toBe('24h');
    const event = await f.t.prisma.db.event.findUniqueOrThrow({ where: { id: ev.id } });
    expect(event.remindedAt).toBeNull();
    expect(event.reminded1hAt).not.toBeNull();
    const handler = f.t.app.get(NotificationEventsHandler);
    await handler.eventReminder(p);
    await handler.eventReminder(p);
    const notes = await f.t.prisma.db.notification.findMany({
      where: { userId: u.id },
      select: { title: true },
    });
    expect(notes).toEqual([{ title: `Sắp bắt đầu sau 1 giờ: ${ev.title}` }]);
  });
});
