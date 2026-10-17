import { seed } from '@opchub/shared/fixtures';
import { buildEvents, DAY_MS, MOCK_NOW, MY_EVENT_REGS } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { requireUserId } from './people';

/**
 * Domain event: e1–e5 (giờ theo nhãn "T5, 22/10" + "19:30" giờ VN như mock), đăng ký của TK demo
 * (MY_EVENT_REGS) và người đăng ký mẫu của drawer Admin (tối đa 7 — SEED_REGISTRANTS của mock).
 * `registered_count` = số hiển thị của prototype (`reg` + đăng ký demo), không phải số dòng
 * `event_registrations` — Q-B62-10.
 */

const EV_ADDR = seed.EV_ADDR as Record<string, { address: string; mapUrl?: string }>;

/** Người đăng ký mẫu (event-admin.ts SEED_REGISTRANTS) — thứ tự = mới → cũ */
const SEED_REGISTRANTS = [
  'Trần Quốc Bảo',
  'Lê Minh Anh',
  'Phạm Thu Hà',
  'Đỗ Hải Yến',
  'Vũ Đức Long',
  'Hoàng Gia Linh',
  'Ngô Thành Đạt',
];
const MAX_SEED = 7;

export async function seedEvents(tx: DbTx): Promise<void> {
  const events = buildEvents();
  await tx.event.createMany({
    data: events.map((e, i) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      mode: e.mode,
      startsAt: new Date(e.startsAt),
      place: e.place,
      address: e.address,
      mapUrl: EV_ADDR[e.id]?.mapUrl || null,
      seats: e.seats,
      registeredCount: e.registered,
      registrationOpen: true,
      createdBy: 'admin',
      createdAt: new Date(MOCK_NOW - (30 - i) * DAY_MS),
      updatedAt: new Date(MOCK_NOW - (30 - i) * DAY_MS),
    })),
  });
  const regs = events.flatMap((e) => {
    const sample = SEED_REGISTRANTS.slice(0, Math.min(MAX_SEED, e.registered)).map((name, i) => ({
      eventId: e.id,
      userId: requireUserId(name),
      createdAt: new Date(MOCK_NOW - (i + 1) * DAY_MS),
    }));
    const mine = MY_EVENT_REGS.includes(e.id)
      ? [{ eventId: e.id, userId: 'm1', createdAt: new Date(MOCK_NOW) }]
      : [];
    return [...mine, ...sample.filter((s) => !mine.some((m) => m.userId === s.userId))];
  });
  await tx.eventRegistration.createMany({
    data: regs.map((r) => ({ ...r, status: 'registered' as const, updatedAt: r.createdAt })),
  });
}
