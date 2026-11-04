import {
  REGIONAL_LABELS,
  regionalBankSchema,
  type RegionalRegion,
  type RegionalShareSummary,
} from '@opchub/shared/api-domains';
import type { RegionalShareAggregate } from '../repositories/regional-share-summary.repository';

type Slot = {
  region: RegionalRegion;
  userId: string | null;
  bankName: string | null;
  bankNo: string | null;
  bankHolder: string | null;
  provinces: { province: string }[];
};
type Member = { id: string; fullName: string; email: string };
type Bank = { region: RegionalRegion; userId: string; bank: unknown };
type Row = RegionalShareSummary['rows'][number];
const sum = (rows: RegionalShareAggregate[]) => rows.reduce((n, r) => n + Number(r.amount), 0);
function payees(
  slot: Slot,
  items: RegionalShareAggregate[],
  members: Member[],
  banks: Bank[],
  bank: Row['bank'],
) {
  const due = items.filter((a) => a.status === 'pending' && a.closed);
  return [...new Set([...(slot.userId ? [slot.userId] : []), ...due.map((a) => a.userId)])].map(
    (userId) => {
      const pending = due.filter((a) => a.userId === userId);
      const oldBank = regionalBankSchema.safeParse(
        banks.find((b) => b.region === slot.region && b.userId === userId)?.bank,
      );
      return {
        userId,
        fullName: members.find((m) => m.id === userId)?.fullName ?? userId,
        due: sum(pending),
        monthKeys: [...new Set(pending.flatMap((a) => a.months))].sort(),
        bank: userId === slot.userId ? bank : oldBank.success ? oldBank.data : null,
      };
    },
  );
}
export function regionalSummaryRows(
  slots: Slot[],
  aggregates: RegionalShareAggregate[],
  members: Member[],
  banks: Bank[],
): Row[] {
  return slots.map((slot) => {
    const items = aggregates.filter((a) => a.region === slot.region);
    const parsed = regionalBankSchema.safeParse(slot);
    const bank = parsed.success ? parsed.data : null;
    return {
      region: slot.region,
      label: REGIONAL_LABELS[slot.region],
      member: members.find((m) => m.id === slot.userId) ?? null,
      bank,
      provinces: slot.provinces.length,
      affiliates: new Set(items.flatMap((a) => a.affiliates)).size,
      count: items.reduce((n, a) => n + Number(a.count), 0),
      total: sum(items),
      paid: sum(items.filter((a) => a.status === 'paid')),
      due: sum(items.filter((a) => a.status === 'pending' && a.closed)),
      pendingCurrent: sum(items.filter((a) => a.status === 'pending' && !a.closed)),
      payees: payees(slot, items, members, banks, bank),
    };
  });
}
