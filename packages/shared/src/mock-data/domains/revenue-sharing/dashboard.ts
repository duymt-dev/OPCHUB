import {
  revenueDashboardSchema,
  revenueFormerSchema,
  type RevenueFormerQuery,
  type RevenueDirector,
} from '../../../api-domains';
import { mockDirectorState } from '../regional-directors/state';
import { mockRecipientBank } from '../regional-directors/bank';
import { mockDb } from '../store';
import { drainMockRevenue } from './capture';
import { revenueStats } from './read';

export function mockRevenueDashboard(q = '', now = Date.now()) {
  const s = drainMockRevenue();
  const slots = mockDirectorState().config.slots;
  const items: RevenueDirector[] = slots.map((slot) => ({
    id: slot.region,
    directorId: slot.incumbent?.id ?? null,
    name: slot.incumbent?.fullName ?? null,
    email: slot.incumbent?.email ?? null,
    region: slot.region,
    provinces: slot.provinces,
    current: true,
    bank: slot.incumbent ? slot.bank : null,
    stats: revenueStats(s.shares.filter((r) => r.director && r.director.id === slot.incumbent?.id)),
  }));
  const names = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' };
  const visible = items.filter((r) =>
    `${r.name ?? ''} ${names[r.region]} · ${r.provinces.length} tỉnh`
      .toLocaleLowerCase('vi')
      .includes(q.trim().toLocaleLowerCase('vi')),
  );
  const ids = new Set(items.flatMap((r) => (r.directorId ? [r.directorId] : [])));
  return revenueDashboardSchema.parse({
    asOf: new Date(now).toISOString(),
    policy: s.policy,
    items,
    stats: revenueStats(s.shares.filter((r) => r.director && ids.has(r.director.id))),
    visible: {
      ids: visible.map((r) => r.id),
      due: visible.reduce((n, r) => n + BigInt(r.stats.due), 0n).toString(),
      paid: visible.reduce((n, r) => n + BigInt(r.stats.paid), 0n).toString(),
    },
  });
}
export function mockFormerRevenueDirectors(q: RevenueFormerQuery) {
  const s = drainMockRevenue();
  const current = new Set(mockDirectorState().config.slots.map((r) => r.incumbent?.id));
  const ids = mockDirectorState()
    .recipientBanks.map((r) => r.directorId)
    .filter(
      (id) =>
        !current.has(id) &&
        (!q.beforeId || id < q.beforeId) &&
        s.shares.some((r) => r.director?.id === id),
    )
    .sort()
    .reverse();
  const items = ids.slice(0, q.size).map((id) => {
    const rows = s.shares.filter((r) => r.director?.id === id);
    const last = rows.toSorted(
      (a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.id.localeCompare(a.id),
    )[0];
    if (!last) throw new Error('Missing former beneficiary share');
    const fee = mockDb().fees.find((f) => f.userId === id);
    return {
      id,
      directorId: id,
      current: false,
      name: fee?.fullName ?? last.director?.name ?? null,
      email: fee?.email ?? null,
      region: last.region,
      provinces: [],
      bank: mockRecipientBank(id) ?? null,
      stats: revenueStats(rows),
    };
  });
  return revenueFormerSchema.parse({
    items,
    nextCursor: ids.length > q.size ? items.at(-1)?.id : null,
  });
}
