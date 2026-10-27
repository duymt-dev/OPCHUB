import type { Fundraising, FundraisingPayment, FundraisingStatus } from '../../api-domains';
import { fundAmountOf } from '../../membership/pricing';
import { readMockPrices } from './price-config';
import { members } from '../../fixtures';
import { FEE_BANK } from './extras';
import { recordAudit } from './audit-store';
import { publishMockNotification } from './notification-runtime';
import { nameOfUser } from './project-store';
import { mockDb, nextId } from './store';
import type { MockDb } from './store-types';
import { conflict, iso, notFound, ok, type MockResult } from './util';

/**
 * Chỉ cho MSW/e2e — Gói Gọi vốn (V4-610) như server: mã `GV` + 6 số, "Tôi đã chuyển khoản" → giả
 * webhook trễ → chờ thẩm định; Admin duyệt → 6 tháng; từ chối. Seed: dự án đã khai báo gọi vốn là
 * khoản legacy đang hiệu lực (Q-V4-610-2, như migration). Portal + Admin chung cookie
 * `opchub-mock-gv` (cùng host) để thấy cùng trạng thái.
 */
export interface MockFundraising {
  id: string;
  projectId: string;
  ownerName: string;
  code: string | null;
  amount: number;
  status: FundraisingStatus;
  legacy: boolean;
  endsAt: string | null;
  createdAt: string;
}

const DAY_MS = 86_400_000;
const SIX_MONTHS_MS = 182 * DAY_MS;
const states = new WeakMap<MockDb, { rows: MockFundraising[]; seq: number }>();

function state() {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    const now = Date.now();
    s = {
      seq: 0,
      rows: db.projects
        .filter((p) => p.funding)
        .map((p) => ({
          id: `fr-legacy-${p.id}`,
          projectId: p.id,
          ownerName: p.ownerName,
          code: null,
          amount: 0,
          status: 'active' as const,
          legacy: true,
          endsAt: iso(now + SIX_MONTHS_MS),
          createdAt: iso(now),
        })),
    };
    states.set(db, s);
  }
  return s;
}

const projectName = (id: string) => mockDb().projects.find((p) => p.id === id)?.name ?? '';
const userIdOfName = (name: string) => members.find((m) => m.name === name)?.id;

export const toMockFundraising = (r: MockFundraising): Fundraising => ({
  id: r.id,
  projectId: r.projectId,
  projectName: projectName(r.projectId),
  code: r.code,
  amount: r.amount,
  status: r.status,
  endsAt: r.endsAt,
  createdAt: r.createdAt,
});

const payment = (r: MockFundraising): FundraisingPayment => ({
  ...toMockFundraising(r),
  bank: FEE_BANK,
  transferContent: `OPCHUB ${r.code ?? ''}`.trim(),
});

/** Gói Gọi vốn đang hiệu lực (tab Gọi vốn + quan tâm) */
export function isFundraisingActive(projectId: string, now = Date.now()): boolean {
  return state().rows.some(
    (r) =>
      r.projectId === projectId &&
      r.status === 'active' &&
      !!r.endsAt &&
      Date.parse(r.endsAt) > now,
  );
}

/** Khoản gần nhất không legacy (chip Admin, chủ dự án) */
export function latestFundraising(projectId: string): MockFundraising | null {
  return state().rows.find((r) => r.projectId === projectId && !r.legacy) ?? null;
}

export function startMockFundraising(
  userId: string,
  projectId: string,
): MockResult<FundraisingPayment> {
  const p = mockDb().projects.find((x) => x.id === projectId);
  if (!p || p.ownerName !== nameOfUser(userId)) return notFound('Không tìm thấy dự án');
  const mine = state().rows.filter((r) => r.projectId === projectId);
  const open = mine.find((r) => r.status === 'pending_payment');
  if (open) return ok(payment(open));
  if (mine.some((r) => r.status === 'pending_review'))
    return conflict('Gói Gọi vốn đang chờ Admin thẩm định');
  const live = mine.find((r) => r.status === 'active' && !r.legacy && r.endsAt);
  if (live?.endsAt && Date.parse(live.endsAt) - Date.now() > 14 * DAY_MS)
    return conflict('Dự án đang gọi vốn');
  const s = state();
  s.seq += 1;
  const row: MockFundraising = {
    id: nextId('fr'),
    projectId,
    ownerName: p.ownerName,
    code: `GV${String(s.seq).padStart(6, '0')}`,
    // D-106: dự án đã từng gọi vốn (khoản có phí đã duyệt) → giá gia hạn `fund.r`
    amount: fundAmountOf(
      readMockPrices(),
      mine.some((r) => !r.legacy && (r.status === 'active' || r.status === 'expired')),
    ),
    status: 'pending_payment',
    legacy: false,
    endsAt: null,
    createdAt: iso(Date.now()),
  };
  s.rows.unshift(row);
  return ok(payment(row));
}

/** V4-611 thẻ tuỳ chọn "Gói Gọi vốn": chủ có khoản chờ thẩm định / đang gọi vốn (như server) */
export const ownerHasMockFundraising = (ownerName: string) =>
  state().rows.some(
    (r) => r.ownerName === ownerName && (r.status === 'pending_review' || r.status === 'active'),
  );

export const myMockFundraisings = (userId: string) => ({
  items: state()
    .rows.filter((r) => !r.legacy && r.ownerName === nameOfUser(userId))
    .map(toMockFundraising),
});

const findOwned = (userId: string, id: string) =>
  state().rows.find((r) => r.id === id && r.ownerName === nameOfUser(userId));

function notifyOwner(r: MockFundraising, kind: string, title: string, body: string): void {
  const uid = userIdOfName(r.ownerName);
  if (!uid) return;
  publishMockNotification(mockDb(), uid, {
    id: `fundraising:${kind}:${r.id}`,
    type: 'invest',
    title,
    body,
    link: `/projects/${r.projectId}`,
    read: false,
    createdAt: iso(Date.now()),
  });
}

/** D-31: chỉ ghi nhận — `settleMockFundraising` (webhook giả trễ) chuyển trạng thái */
export function confirmMockFundraising(userId: string, id: string) {
  const r = findOwned(userId, id);
  if (!r) return notFound('Không tìm thấy Gói Gọi vốn');
  return ok({ status: r.status, awaitingWebhook: r.status === 'pending_payment' });
}

/** Webhook ngân hàng giả: đủ tiền → chờ Admin thẩm định */
export function settleMockFundraising(id: string): boolean {
  const r = state().rows.find((x) => x.id === id);
  if (!r || r.status !== 'pending_payment') return false;
  r.status = 'pending_review';
  notifyOwner(
    r,
    'paid',
    'Đã nhận Gói Gọi vốn · chờ Admin thẩm định',
    `${projectName(r.projectId)} sẽ hiển thị ở mục Gọi vốn sau khi được duyệt.`,
  );
  return true;
}

/** AD-06: duyệt → 6 tháng; từ chối. Chỉ từ chờ thẩm định (luật 7) */
export function reviewMockFundraising(
  actorId: string,
  projectId: string,
  id: string,
  decision: 'approve' | 'reject',
): MockResult<MockFundraising> {
  const r = state().rows.find((x) => x.id === id && x.projectId === projectId);
  if (!r) return notFound('Không tìm thấy Gói Gọi vốn');
  if (r.status !== 'pending_review')
    return conflict('Gói Gọi vốn không ở trạng thái chờ thẩm định');
  const name = projectName(projectId);
  recordAudit(actorId, `project.fundraising_${decision}`, id, `${r.code ?? ''} · ${name}`);
  if (decision === 'approve') {
    r.status = 'active';
    r.endsAt = iso(Date.now() + SIX_MONTHS_MS);
    notifyOwner(
      r,
      'approve',
      `Gói Gọi vốn đã được duyệt: ${name}`,
      'Dự án hiển thị ở mục Gọi vốn trong 6 tháng.',
    );
  } else {
    r.status = 'rejected';
    notifyOwner(
      r,
      'reject',
      `Gói Gọi vốn bị từ chối: ${name}`,
      'Admin sẽ liên hệ để hoàn tất hồ sơ.',
    );
  }
  return ok(r);
}

/** Cầu Portal ↔ Admin: chép bản ghi đã đổi, gộp theo id (bản ghi app kia mới hơn thắng) */
export const FUNDRAISING_BRIDGE_COOKIE = 'opchub-mock-gv';
const MAX_COOKIE = 3800;

function decode(raw: string | undefined): MockFundraising[] {
  if (!raw) return [];
  try {
    const text = raw.startsWith('%5B') ? decodeURIComponent(raw) : raw;
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? (v as MockFundraising[]) : [];
  } catch {
    return [];
  }
}

const RANK: Record<FundraisingStatus, number> = {
  pending_payment: 0,
  pending_review: 1,
  active: 2,
  rejected: 2,
  expired: 3,
};

export function syncFundraisingBridge(raw: string | undefined): void {
  const s = state();
  for (const r of decode(raw)) {
    const cur = s.rows.find((x) => x.id === r.id);
    if (!cur) s.rows.unshift(r);
    else if (RANK[r.status] > RANK[cur.status]) Object.assign(cur, r);
    const n = Number(r.code?.slice(2) ?? 0);
    if (n > s.seq) s.seq = n;
  }
}

export function fundraisingBridgeCookie(raw: string | undefined): string {
  const mine = state().rows.filter((r) => !r.legacy);
  const list = [...decode(raw).filter((x) => !mine.some((m) => m.id === x.id)), ...mine];
  let v = encodeURIComponent(JSON.stringify(list));
  while (v.length > MAX_COOKIE && list.length > 1) {
    list.shift();
    v = encodeURIComponent(JSON.stringify(list));
  }
  return `${FUNDRAISING_BRIDGE_COOKIE}=${v}; Path=/`;
}
