import {
  revenueReceiptSchema,
  revenueReceivedSchema,
  type RevenueReceipt,
} from '../../../outbox/revenue-sharing';
import { allocateRevenue } from '../../../revenue-sharing/math';
import { affiliateMockState } from '../affiliate';
import { mockDirectorState } from '../regional-directors/state';
import { mockDb } from '../store';
import { logSetting } from '../settings-log';
import { mockRevenueState, revenueMonth } from './state';

/** Successful reconciliation only. Capture the event before any later slot/policy change. */
export function captureMockRevenue(input: RevenueReceipt): string | null {
  const receipt = revenueReceiptSchema.parse(input);
  if (!receipt.amount) return null;
  const s = mockRevenueState();
  const existing = s.shares.find(
    (r) => r.source === receipt.source && r.sourceId === receipt.sourceId,
  );
  const pending = s.pending.find(
    (r) =>
      r.payload.receipt.source === receipt.source &&
      r.payload.receipt.sourceId === receipt.sourceId,
  );
  if (existing) return existing.id;
  if (pending) return pending.id;
  const first = s.first.find(([id]) => id === receipt.customerId);
  const previousFirst = first?.[1];
  const firstReceivedAt =
    previousFirst && previousFirst < receipt.receivedAt ? previousFirst : receipt.receivedAt;
  const affiliateId = affiliateMockState().referrals.get(receipt.customerId)?.agentId ?? null;
  const db = mockDb();
  const group = [...(db.groupMembers.get(affiliateId ?? '') ?? [])].flatMap(([id, status]) => {
    const g = db.groups.find((row) => row.id === id);
    return status === 'member' && g?.kind === 'province' ? [g] : [];
  })[0];
  const slot = mockDirectorState().config.slots.find(
    (row) => group && row.provinces.includes(group.province),
  );
  const payload = revenueReceivedSchema.parse({
    receipt,
    firstReceivedAt,
    policy: s.policy,
    affiliateId,
    region: slot?.region ?? null,
    director: slot?.incumbent
      ? { id: slot.incumbent.id, name: slot.incumbent.fullName, bank: slot.bank }
      : null,
  });
  const id = crypto.randomUUID();
  if (first) first[1] = firstReceivedAt;
  else s.first.push([receipt.customerId, firstReceivedAt]);
  s.pending.push({ id, payload });
  if (previousFirst && receipt.receivedAt < previousFirst)
    reanchor(receipt.customerId, receipt.receivedAt);
  return id;
}

/** Local outbox consumer under the existing shared browser lease; replay is source-idempotent. */
export function drainMockRevenue() {
  const s = mockRevenueState();
  for (const { id, payload: p } of s.pending) {
    const r = p.receipt;
    if (s.shares.some((row) => row.source === r.source && row.sourceId === r.sourceId)) continue;
    const first = s.first.find(([user]) => user === r.customerId)?.[1] ?? p.firstReceivedAt;
    s.shares.push({
      ...r,
      id,
      customerName: null,
      affiliateName: null,
      affiliateId: p.affiliateId,
      director: p.director,
      region: p.region,
      policy: p.policy,
      firstReceivedAt: first,
      ...allocateRevenue({
        amount: r.amount,
        firstReceivedAt: new Date(first),
        receivedAt: new Date(r.receivedAt),
        policy: p.policy,
        hasDirector: p.director !== null,
      }),
      monthKey: revenueMonth(r.recordedAt),
      status: 'recorded',
      payoutId: null,
    });
  }
  s.pending = [];
  return s;
}

function reanchor(customerId: string, first: string) {
  for (const row of mockRevenueState().shares) {
    if (row.customerId !== customerId || row.firstReceivedAt <= first) continue;
    if (row.status === 'paid') {
      logSetting(
        'system',
        'affiliate.revenue_review_required',
        row.id,
        'Khoản đã chi có giao dịch thực thu sớm hơn; cần kiểm tra, không tự thu hồi.',
        'affiliate',
      );
      continue;
    }
    Object.assign(row, {
      firstReceivedAt: first,
      ...allocateRevenue({
        amount: row.amount,
        firstReceivedAt: new Date(first),
        receivedAt: new Date(row.receivedAt),
        policy: row.policy,
        hasDirector: row.director !== null,
      }),
    });
  }
}
