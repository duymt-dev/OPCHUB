import { vi } from 'vitest';
import { Prisma } from '@opchub/db';
import { OutboxRelayService } from '@/common/outbox';
import { OutboxRepository, type PendingEvent } from '@/common/outbox/outbox.repository';
import type { TestApp } from '../setup/test-app';

/** Real lease/mark/backoff and production handlers; claim only this fixture's IDs. */
export function scopedOutbox(
  t: TestApp,
  ids: bigint[],
  register: (relay: OutboxRelayService) => void,
) {
  const repo = new OutboxRepository(t.prisma);
  vi.spyOn(repo, 'claim').mockImplementation(async (types, limit, lease) => {
    const rows = await t.prisma.db.$queryRaw<PendingEvent[]>(Prisma.sql`
      UPDATE outbox_events SET locked_until=now()+${lease}*interval '1 second'
      WHERE id IN (SELECT id FROM outbox_events WHERE id=ANY(${ids}::bigint[])
        AND type=ANY(${types}::text[]) AND dispatched_at IS NULL
        AND (locked_until IS NULL OR locked_until<now()) ORDER BY id LIMIT ${limit}
        FOR UPDATE SKIP LOCKED) RETURNING id,type,payload,attempts`);
    return rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  });
  const relay = new OutboxRelayService(repo);
  register(relay);
  return relay;
}
