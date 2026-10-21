import { parseOutboxPayload } from '@opchub/shared/outbox';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotificationEventsHandler } from '@/modules/notification';
import { createGroup, removeTestGroups } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-207 NA-07 warning outbox retry identity', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });

  it('one report delivers once when the same moderation.warned payload is retried', async () => {
    const user = await createUser(t, { fee: 'active' });
    const group = await createGroup(t);
    const reportId = randomUUID();
    const payload = parseOutboxPayload('moderation.warned', {
      userId: user.id,
      roomId: `${group.id}-general`,
      messageId: randomUUID(),
      reportId,
    });
    const handler = t.app.get(NotificationEventsHandler);
    expect(payload.reportId).toBe(reportId);
    await handler.warned(payload);
    await handler.warned(payload);
    const rows = await t.prisma.db.notification.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, link: true },
    });
    expect(rows).toEqual([
      {
        id: `moderation-warn-${reportId}`,
        title: 'Tin nhắn của bạn vi phạm nội quy nhóm',
        link: `/chat/${group.id}`,
      },
    ]);
  });

  it('two resolved reports for the same message deliver two warnings, each retry-safe', async () => {
    const user = await createUser(t, { fee: 'active' });
    const group = await createGroup(t);
    const messageId = randomUUID();
    const first = randomUUID();
    const second = randomUUID();
    const handler = t.app.get(NotificationEventsHandler);
    for (const reportId of [first, second, first, second])
      await handler.warned({
        userId: user.id,
        roomId: `${group.id}-general`,
        messageId,
        reportId,
      });
    expect(await t.prisma.db.notification.count({ where: { userId: user.id } })).toBe(2);
  });

  it('legacy payloads remain consumable, while an absent room creates no notification', async () => {
    const user = await createUser(t, { fee: 'active' });
    const group = await createGroup(t);
    const handler = t.app.get(NotificationEventsHandler);
    const legacy = parseOutboxPayload('moderation.warned', {
      userId: user.id,
      roomId: `${group.id}-general`,
      messageId: randomUUID(),
    });
    expect(legacy.reportId).toBeUndefined();
    await handler.warned(legacy);
    await handler.warned({ ...legacy, roomId: 'missing-warning-room', reportId: randomUUID() });
    expect(await t.prisma.db.notification.count({ where: { userId: user.id } })).toBe(1);
  });
});
