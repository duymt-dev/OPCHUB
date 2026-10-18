import { OutboxRelayService } from '@/common/outbox';
import type { TestApp } from '../setup/test-app';

/** Xả hết outbox đang chờ (relay thật, handler thật) — giả lập worker chạy */
export async function drainOutbox(t: TestApp): Promise<void> {
  const relay = t.app.get(OutboxRelayService);
  while ((await relay.relayOnce()) > 0);
}

/** Giả lập hết backoff / lease để relay thử lại ngay */
export const expireLeases = (t: TestApp) =>
  t.prisma.db.$executeRaw`UPDATE outbox_events SET locked_until = now() - interval '1 second'
    WHERE dispatched_at IS NULL`;

/** Admin khoá / mở khoá qua API thật (outbox cùng transaction) */
export async function setStatus(
  t: TestApp,
  adminToken: string,
  userId: string,
  status: 'locked' | 'active',
): Promise<void> {
  const r = await t.call(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    token: adminToken,
    json: { status },
  });
  if (r.status !== 200) throw new Error(`PATCH status ${status} → ${r.status}`);
}
