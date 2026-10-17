import type { EventMode } from '@opchub/db';
import { randomUUID } from 'node:crypto';
import type { TestApp } from '../setup/test-app';

/** Sự kiện test (tiêu đề có tiền tố để dọn ở afterAll) */
export const TEST_EVENT_PREFIX = 'Sự kiện thử';

export async function createEvent(
  t: TestApp,
  spec: { seats?: number; mode?: EventMode; registrationOpen?: boolean; startsAt?: Date } = {},
): Promise<{ id: string; title: string }> {
  const id = randomUUID();
  const title = `${TEST_EVENT_PREFIX} ${id.slice(0, 8)}`;
  await t.prisma.db.event.create({
    data: {
      id,
      title,
      mode: spec.mode ?? 'offline',
      startsAt: spec.startsAt ?? new Date(Date.UTC(2030, 9, 22, 12, 30)),
      place: 'Hà Nội',
      address: '18 Tam Trinh',
      seats: spec.seats ?? 10,
      registrationOpen: spec.registrationOpen ?? true,
    },
  });
  return { id, title };
}

export async function removeTestEvents(t: TestApp): Promise<void> {
  await t.prisma.db.event.deleteMany({ where: { title: { startsWith: TEST_EVENT_PREFIX } } });
}
