import { z } from 'zod';
import { buildEvents, MY_EVENT_REGS } from '@opchub/shared/mock-domains';
import { createPrismaClient } from '../src/client';

/** Case-local prerequisites, never run against native/HOLD or integration databases. */
// eslint-disable-next-line no-restricted-syntax -- fixture CLI validates its environment before connecting
const env = z.object({ DIRECT_URL: z.url() }).parse(process.env);
const target = new URL(env.DIRECT_URL);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  target.port !== '5432' ||
  target.pathname !== '/opchub_v46_812_dev'
)
  throw new Error('Acceptance prerequisites require the exact isolated TIP-812 database');
const mode = z
  .enum(['events-list', 'events-portal', 'events-open', 'events-upcoming', 'marketing-summary'])
  .parse(process.argv[2]);
const db = createPrismaClient(env.DIRECT_URL, { max: 1 });
try {
  if (mode === 'events-list' || mode === 'events-portal') {
    const events = buildEvents();
    const ids = events.map((e) => e.id);
    const max = Math.max(...events.map((e) => e.registered));
    const users = Array.from({ length: max }, (_, i) => ({
      id: `v46-812-event-${i}`,
      memberCode: `TV${String(800000 + i).padStart(6, '0')}`,
      accountType: 'personal' as const,
      fullName: `Event acceptance ${i}`,
      email: `v46-812-event-${i}@demo.opchub.vn`,
    }));
    await db.$transaction(async (tx) => {
      await tx.user.createMany({ data: users });
      await tx.eventRegistration.deleteMany({ where: { eventId: { in: ids } } });
      await tx.eventRegistration.createMany({
        data: events.flatMap((e) =>
          users.slice(0, e.registered).map((u, i) => ({
            eventId: e.id,
            userId: i === 0 && MY_EVENT_REGS.includes(e.id) ? 'm1' : u.id,
          })),
        ),
      });
      // All counts correspond to real rows, not fabricated aggregate columns.
      await tx.$executeRaw`
        UPDATE events AS e SET registered_count = v.n
        FROM unnest(${ids}::text[], ${events.map((e) => e.registered)}::int[]) AS v(id, n)
        WHERE e.id = v.id`;
    });
    if (mode === 'events-portal')
      await db.event.updateMany({
        where: { id: { in: ['e1', 'e4'] } },
        data: {
          startsAt: new Date(Date.now() + 86400000),
          endsAt: null,
          registrationOpen: true,
          closedAt: null,
        },
      });
  } else if (mode === 'events-open') {
    const changed = await db.event.updateMany({
      where: { id: 'e1' },
      data: { registrationOpen: true, closedAt: null },
    });
    if (changed.count !== 1) throw new Error('Expected seeded e1');
  } else if (mode === 'events-upcoming') {
    const now = Date.now();
    await db.$executeRaw`
      UPDATE events AS e SET starts_at = v.at, registration_open = true, closed_at = NULL
      FROM unnest(${['e2', 'e3']}::text[],
        ${[new Date(now + 86400000), new Date(now + 2 * 86400000)]}::timestamptz[]) AS v(id, at)
      WHERE e.id = v.id`;
  } else {
    // Delivery date is independent of the historical campaign scheduling date shown in the table.
    const deliveredAt = new Date(Date.now() - 3600000);
    const changed = await db.mailLog.updateMany({
      where: {
        status: 'sent',
        OR: [{ campaignId: { in: ['cp1', 'cp2', 'cp3', 'cp4'] } }, { id: { in: ['w1', 'w2'] } }],
      },
      data: { createdAt: deliveredAt, sentAt: deliveredAt },
    });
    if (changed.count !== 4052)
      throw new Error(`Expected 4052 seeded deliveries, got ${changed.count}`);
  }
  process.stdout.write(`Isolated acceptance prerequisite ready: ${mode}\n`);
} finally {
  await db.$disconnect();
}
