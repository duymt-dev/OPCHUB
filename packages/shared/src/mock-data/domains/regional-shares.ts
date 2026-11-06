import { REGIONAL_DEMO_AFFILIATES } from './regional-share-demo';
import { recordMockReference } from './affiliate-reference';
import {
  customerYearOf,
  payoutMonthOf,
  regionalPayoutDate,
  regionalAmount,
  regionalPercent,
} from '../../membership/regional-share';
import {
  regionalBankSchema,
  regionalProvinces,
  type RegionalRegion,
  type RegionalShareSummary,
} from '../../api-domains';
import { communities, industryGroups } from '../../fixtures';
import { mockDb } from './store';
import { affiliateMockState } from './affiliate';
import { mockRegionalDirectors } from './regional-directors';
import { readMockAffiliatePolicy } from './affiliate-policy';
import { regionalShareState, type MockRegionalShare } from './regional-share-state';
import { regionalMockBanks, rememberRegionalBank } from './regional-share-bank';
import { conflict, ok, MOCK_NOW } from './util';
import { recordAudit } from './audit-store';
import {
  encodeRegionalShareCursor,
  decodeRegionalShareCursor,
} from '../../membership/regional-share-cursor';
import { publishMockNotification } from './notification-runtime';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
export function mockRegionalShares(q = '', now = new Date()): RegionalShareSummary {
  const s = regionalShareState();
  const directors = mockRegionalDirectors(false);
  const slots = directors.items;
  const month = payoutMonthOf(now);
  const policy = readMockAffiliatePolicy();
  const rows = slots.map((slot) => {
    const items = s.rows.filter((r) => r.region === slot.region);
    const closed = items.filter(
      (r) => r.status === 'pending' && payoutMonthOf(r.recordedAt) < month,
    );
    const sum = (rows: MockRegionalShare[]) => rows.reduce((n, r) => n + r.directorAmount, 0);
    const bank = regionalBankSchema.safeParse(slot.bank);
    const payees = [
      ...new Set([
        ...(slot.member ? [slot.member.id] : []),
        ...closed.flatMap((r) => (r.directorUserId ? [r.directorUserId] : [])),
      ]),
    ].map((userId) => {
      const due = closed.filter((r) => r.directorUserId === userId);
      const prior = regionalMockBanks().get(`${slot.region}:${userId}`);
      const name =
        directors.history.find((h) => h.userId === userId)?.userName ??
        [...s.receipts.values()].find((p) => p.directorUserId === userId)?.directorName;
      return {
        userId,
        fullName: slot.member?.id === userId ? slot.member.fullName : (name ?? userId),
        due: sum(due),
        monthKeys: [...new Set(due.map((r) => payoutMonthOf(r.recordedAt)))].sort(),
        bank: slot.member?.id === userId ? (bank.success ? bank.data : null) : (prior ?? null),
      };
    });
    return {
      region: slot.region,
      label: slot.label,
      member: slot.member,
      provinces: slot.provinces.length,
      bank: bank.success ? bank.data : null,
      affiliates: new Set(items.map((r) => r.affiliateId)).size,
      count: items.length,
      total: sum(items),
      paid: sum(items.filter((r) => r.status === 'paid')),
      due: sum(closed),
      pendingCurrent: sum(
        items.filter((r) => r.status === 'pending' && payoutMonthOf(r.recordedAt) >= month),
      ),
      payees,
    };
  });
  return {
    kpi: {
      total: rows.reduce((s, r) => s + r.total, 0),
      count: rows.reduce((s, r) => s + r.count, 0),
      affiliates: new Set(s.rows.filter((r) => r.region).map((r) => r.affiliateId)).size,
      due: rows.reduce((s, r) => s + r.due, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      payoutDate: regionalPayoutDate(now),
    },
    rule: {
      years: [1, 2, 3].map((year) => ({ year, percent: regionalPercent(year, policy) })),
      min: policy.regionalMin,
    },
    rows: rows.filter(
      (r) => !q || fold(`${r.label} ${r.member?.fullName ?? ''}`).includes(fold(q)),
    ),
  };
}
export function mockRegionalSharePage(
  region: RegionalRegion,
  cursor: string | undefined,
  limit: number,
) {
  const rows = regionalShareState()
    .rows.filter((r) => r.region === region)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id));
  const decoded = cursor ? decodeRegionalShareCursor(cursor) : null;
  if (cursor && !decoded)
    return {
      ok: false as const,
      status: 422 as const,
      code: 'VALIDATION_ERROR' as const,
      message: 'Con trỏ không hợp lệ',
    };
  const available = decoded
    ? rows.filter(
        (r) =>
          r.recordedAt < decoded.recordedAt ||
          (r.recordedAt === decoded.recordedAt && r.id < decoded.id),
      )
    : rows;
  const items = available.slice(0, limit);
  const more = Math.max(0, available.length - items.length);
  const last = items.at(-1);
  return ok({
    items,
    nextCursor:
      more && last ? encodeRegionalShareCursor({ recordedAt: last.recordedAt, id: last.id }) : null,
    more,
  });
}
export function mockRegionalPayoutHistory(region: RegionalRegion) {
  return {
    items: [...regionalShareState().receipts.values()]
      .filter((r) => r.region === region)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
  };
}
export function mockPayRegional(
  region: RegionalRegion,
  userId: string,
  key: string | undefined,
  actorId: string,
  now = new Date(),
) {
  if (!key || key.length > 200)
    return {
      ok: false as const,
      status: 422 as const,
      code: 'VALIDATION_ERROR' as const,
      message: 'Thiếu header Idempotency-Key',
    };
  const s = regionalShareState();
  const id = `${region}:${userId}:${actorId}:${key}`;
  const prior = s.receipts.get(id);
  if (prior) return ok(prior);
  const payee = mockRegionalShares('', now)
    .rows.find((r) => r.region === region)
    ?.payees.find((p) => p.userId === userId);
  if (!payee?.due) return conflict('Không có khoản chờ chi');
  if (!payee.bank) return conflict(`${payee.fullName} chưa cập nhật tài khoản nhận`);
  const pending = s.rows.filter(
    (r) =>
      r.region === region &&
      r.directorUserId === userId &&
      r.status === 'pending' &&
      payoutMonthOf(r.recordedAt) < payoutMonthOf(now),
  );
  const result = {
    id,
    region,
    paidAt: now.toISOString(),
    directorUserId: userId,
    directorName: payee.fullName,
    amount: payee.due,
    count: pending.length,
    monthKeys: payee.monthKeys,
    bankHolder: payee.bank.bankHolder,
  };
  pending.forEach((r) => {
    r.status = 'paid';
  });
  rememberRegionalBank(region, userId, payee.bank);
  s.receipts.set(id, result);
  publishMockNotification(mockDb(), userId, {
    id: `regional-payout:${id}`,
    type: 'affiliate',
    title: 'Chi trả phần GĐ Vùng',
    body: `Media Soft đã chi trả ${payee.due.toLocaleString('vi-VN')}đ phần GĐ Vùng · ${payee.monthKeys.join(', ')}`,
    link: '/affiliate',
    read: false,
    createdAt: now.toISOString(),
  });
  recordAudit(
    actorId,
    'regional_share.payout',
    id,
    `Chi trả ${payee.due}đ cho GĐ Vùng ${payee.fullName}`,
    {
      amount: payee.due,
      monthKeys: payee.monthKeys,
      bankLast4: payee.bank.bankNo.replaceAll(' ', '').slice(-4),
    },
  );
  return ok(result);
}
export function recordMockRegionalShare(input: {
  source: 'membership' | 'fundraising';
  sourceId: string;
  customerId: string;
  baseAmount: number;
  plan: 'personal' | 'business' | 'fundraising';
  at: string;
}) {
  if (input.baseAmount <= 0) return;
  const s = regionalShareState();
  if (!s.firstPaid.has(input.customerId)) s.firstPaid.set(input.customerId, input.at);
  recordMockReference(input);
  const state = affiliateMockState();
  const ref = state.referrals.get(input.customerId);
  if (!ref || ref.agentId === input.customerId || ref.row.status === 'void') return;
  if (s.rows.some((r) => r.source === input.source && r.sourceId === input.sourceId)) return;
  const groups = mockDb().groupMembers.get(ref.agentId);
  const first = [...(groups ?? [])].find(([, status]) => status === 'member')?.[0];
  const group =
    communities.find((g) => g.id === first) ?? industryGroups.find((g) => g.id === first);
  const directors = mockRegionalDirectors(false);
  const slot = directors.items.find((r) =>
    regionalProvinces(r.region).includes(group?.province ?? ''),
  );
  const year = customerYearOf(s.firstPaid.get(input.customerId) ?? input.at, input.at);
  const appointedAt = directors.history.find(
    (h) => h.region === slot?.region && h.action === 'appoint',
  )?.createdAt;
  const occupied = Boolean(
    slot?.member &&
    Date.parse(appointedAt ?? new Date(MOCK_NOW).toISOString()) <= Date.parse(input.at),
  );
  const percent = occupied ? regionalPercent(year, readMockAffiliatePolicy()) : 0;
  s.rows.push({
    id: crypto.randomUUID(),
    ...input,
    affiliateId:
      REGIONAL_DEMO_AFFILIATES.find((a) => a.userId === ref.agentId)?.affiliateId ?? ref.agentId,
    affiliateUserId: ref.agentId,
    region: occupied && slot ? slot.region : null,
    directorUserId: occupied ? (slot?.member?.id ?? null) : null,
    recordedAt: input.at,
    customerYear: year,
    percent,
    ...regionalAmount(input.baseAmount, percent),
    status: 'pending',
    customerName: ref.row.name,
    affiliateName: state.agents.get(ref.agentId)?.name ?? ref.agentId,
  });
}
