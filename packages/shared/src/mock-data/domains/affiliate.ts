import type { Me } from '../../api';
import {
  COMMISSION_PLAN_LABEL,
  type AffiliateBank,
  type AffiliateCodeResult,
  type AffiliatePageQuery,
  type AffiliatePayouts,
  type AffiliateReferrals,
  type CommissionPlan,
  type MyAffiliate,
} from '../../api-domains';
import { planOf } from '../../membership/plans';
import { readMockPrices } from './price-config';
import { TRIAL_DAYS } from '../../membership/fee-access';
import { feeAmountOf } from './extras';
import { mockDb, type MockDb } from './store';
import { readMockAffiliatePolicy } from './affiliate-policy';
import { conflict, ok, type MockResult } from './util';

interface Agent {
  userId: string;
  code: string;
  name: string;
  email: string;
  rate: number;
  bank: AffiliateBank | null;
}
interface Referral {
  userId: string;
  agentId: string;
  row: AffiliateReferrals['items'][number];
  month: string;
  /** D-110: gói thực trả của khoản (snapshot) */
  plan?: CommissionPlan | undefined;
}
interface State {
  agents: Map<string, Agent>;
  referrals: Map<string, Referral>;
  clicks: Map<string, Map<string, number>>;
  seen: Map<string, number>;
  payouts: Map<string, AffiliatePayouts['items']>;
  knownFees: Map<string, string | null>;
  seq: number;
}
const states = new WeakMap<MockDb, State>();
const monthOf = (date: number) => new Date(date + 7 * 3600000).toISOString().slice(0, 7);
/** D-110: làm tròn đến đồng (như server `commissionAmount`) */
export const mockCommissionAmount = (list: number, rate: number) => Math.round((list * rate) / 100);
const MESSAGES = {
  not_found: 'Mã giới thiệu không tồn tại',
  self: 'Không thể dùng mã giới thiệu của chính bạn',
} as const;
const newAgent = (f: { userId: string; fullName: string; email: string }, code: string) => ({
  userId: f.userId,
  code,
  name: f.fullName,
  email: f.email,
  rate: readMockAffiliatePolicy().defaultRate,
  bank: null,
});

/** State follows resetMockDb identity; reset never leaves another test's referral/click data. */
export function affiliateMockState(): State {
  const db = mockDb();
  let state = states.get(db);
  if (!state) {
    state = {
      agents: new Map(),
      referrals: new Map(),
      clicks: new Map(),
      seen: new Map(),
      payouts: new Map(),
      knownFees: new Map(db.fees.map((f) => [f.userId, f.paidAt])),
      seq: 1000,
    };
    // D-94 3A: mọi TV (không phải NĐT) là đại lý; mã cũ của TV đã đóng phí giữ nguyên thứ tự
    const seed = db.fees
      .filter((f) => f.paidAt && (f.status === 'active' || f.status === 'expiring'))
      .sort((a, b) => a.userId.localeCompare(b.userId));
    const rest = db.fees
      .filter((f) => f.accountType !== 'investor' && !seed.includes(f))
      .sort((a, b) => a.userId.localeCompare(b.userId));
    seed.forEach((f, i) =>
      state?.agents.set(f.userId, {
        userId: f.userId,
        code: f.userId === 'm1' ? 'OPCAN26' : `DEMOOPC${i + 10}`,
        name: f.fullName,
        email: f.email,
        rate: 20,
        bank:
          f.userId === 'm1'
            ? {
                bankName: 'Vietcombank',
                bankNo: '0451000123456',
                bankHolder: 'NGUYEN VAN AN',
              }
            : null,
      }),
    );
    for (const f of rest) state.agents.set(f.userId, newAgent(f, `OPC${++state.seq}`));
    states.set(db, state);
  }
  return state;
}

export function syncMockAffiliates() {
  const s = affiliateMockState();
  for (const f of mockDb().fees) {
    // D-94 3A: đại lý từ khi đăng ký (không chờ đóng phí)
    if (f.accountType !== 'investor' && !s.agents.has(f.userId))
      s.agents.set(f.userId, newAgent(f, `OPC${++s.seq}`));
    s.knownFees.set(f.userId, f.paidAt);
  }
  for (const r of s.referrals.values()) {
    const fee = mockDb().fees.find((f) => f.userId === r.userId);
    if (r.row.status !== 'pending' || !fee?.paidAt) continue;
    // D-110: mã luôn hoạt động — không void theo phí của đại lý
    r.row.status = 'recorded';
    r.row.rate = s.agents.get(r.agentId)?.rate ?? readMockAffiliatePolicy().defaultRate;
    // D-70: phí thực trả của khoản phí (≤ giá gói); D-110 gói thực trả theo loại TK lúc đóng
    r.plan = planOf(fee.accountType) ?? 'personal';
    r.row.plan = COMMISSION_PLAN_LABEL[r.plan];
    r.row.feeAmount = fee.amount;
    r.row.commission = mockCommissionAmount(fee.amount, r.row.rate);
    r.row.date = fee.paidAt;
    r.month = monthOf(Date.parse(fee.paidAt));
  }
  return s;
}

export function checkMockAffiliate(code: string, email = ''): AffiliateCodeResult {
  const a = [...syncMockAffiliates().agents.values()].find(
    (a) => a.code === code.trim().toUpperCase(),
  );
  // D-110: mã luôn hoạt động (không còn "tạm dừng" theo phí của đại lý)
  const reason = !a
    ? 'not_found'
    : a.email.toLowerCase() === email.trim().toLowerCase()
      ? 'self'
      : null;
  if (reason) return { valid: false, reason, message: MESSAGES[reason] };
  return {
    valid: true,
    affiliateName: a?.name ?? '',
    cookieDays: readMockAffiliatePolicy().cookieDays,
  };
}

export function mockReferralError(code: string | undefined, email: string) {
  if (!code) return null;
  const result = checkMockAffiliate(code, email);
  return result.valid
    ? null
    : { message: result.message, fields: [{ path: 'referralCode', message: result.message }] };
}

/** Called only after successful OTP/SSO, as the server's activation transaction does. */
export function attachMockAffiliate(me: Me, code?: string): void {
  const db = mockDb(),
    s = affiliateMockState();
  if (!db.fees.some((f) => f.userId === me.id))
    db.fees.push({
      userId: me.id,
      memberCode: `TV${String(++s.seq).padStart(6, '0')}`,
      fullName: me.fullName,
      email: me.email,
      phone: '',
      accountType: me.accountType,
      joinedAt: new Date().toISOString(),
      // D-94 1A: miễn phí 3 tháng, phí mở theo gói của loại TK (như FeeWriterService)
      status: 'trial',
      paidAt: null,
      validUntil: new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
      amount: feeAmountOf(me.accountType),
    });
  // D-94 3A: TV mới là đại lý ngay khi kích hoạt (NĐT không)
  if (me.accountType !== 'investor' && !s.agents.has(me.id))
    s.agents.set(me.id, newAgent({ ...me, userId: me.id }, `OPC${++s.seq}`));
  if (!code || s.referrals.has(me.id)) return;
  const a = [...s.agents.values()].find((a) => a.code === code);
  if (!a) return;
  s.referrals.set(me.id, {
    userId: me.id,
    agentId: a.userId,
    month: monthOf(Date.now()),
    row: {
      id: `ref-${++s.seq}`,
      name: me.fullName,
      plan: '—',
      date: new Date().toISOString(),
      feeAmount: 0,
      rate: 0,
      commission: 0,
      status: 'pending',
      cancelReason: null,
    },
  });
}

export function clickMockAffiliate(code: string, ip: string): void {
  code = code.trim().toUpperCase();
  if (!checkMockAffiliate(code).valid) return;
  const s = affiliateMockState(),
    key = `${ip}:${code}`,
    now = Date.now();
  if (now - (s.seen.get(key) ?? -Infinity) < 3600000) return;
  s.seen.set(key, now);
  const agent = [...s.agents.values()].find((a) => a.code === code);
  if (!agent) return;
  const days = s.clicks.get(agent.userId) ?? new Map<string, number>();
  const day = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
  days.set(day, (days.get(day) ?? 0) + 1);
  s.clicks.set(agent.userId, days);
}

export function myMockAffiliate(userId: string, origin: string): MyAffiliate {
  const s = syncMockAffiliates(),
    a = s.agents.get(userId);
  const policy = {
    rate: a?.rate ?? readMockAffiliatePolicy().defaultRate,
    // Q-V4-602-3: mức thấp nhất (Gói Cá nhân) — không hứa quá số thật
    perAmount: mockCommissionAmount(
      readMockPrices().per.y,
      a?.rate ?? readMockAffiliatePolicy().defaultRate,
    ),
    cookieDays: readMockAffiliatePolicy().cookieDays,
  };
  if (!a) return { state: 'locked', policy };
  const month = monthOf(Date.now()),
    refs = [...s.referrals.values()].filter((r) => r.agentId === userId);
  const valid = refs.filter((r) => r.row.status === 'recorded' || r.row.status === 'paid');
  const since = new Date(Date.now() + 7 * 3600000 - 29 * 86400000).toISOString().slice(0, 10);
  const clicks30d = [...(s.clicks.get(userId) ?? [])]
    .filter(([d]) => d >= since)
    .reduce((n, [, v]) => n + v, 0);
  return {
    // D-110: mã luôn hoạt động
    state: 'active',
    policy,
    code: a.code,
    link: `${origin}/r/${a.code}`,
    bank: a.bank,
    stats: {
      clicks30d,
      paidCount: valid.length,
      conversionPct: clicks30d ? Math.round((valid.length / clicks30d) * 1000) / 10 : 0,
      thisMonth: valid.filter((r) => r.month === month).reduce((n, r) => n + r.row.commission, 0),
      carryOver: valid
        .filter((r) => r.month < month && r.row.status === 'recorded')
        .reduce((n, r) => n + r.row.commission, 0),
      received: valid
        .filter((r) => r.row.status === 'paid')
        .reduce((n, r) => n + r.row.commission, 0),
    },
  };
}

export function mockAffiliateReferrals(userId: string, q: AffiliatePageQuery): AffiliateReferrals {
  const all = [...syncMockAffiliates().referrals.values()].filter((r) => r.agentId === userId);
  const list = all
    .filter((r) => !q.month || r.month === q.month)
    .sort((a, b) => b.row.date.localeCompare(a.row.date));
  const items = list.slice((q.page - 1) * q.size, q.page * q.size).map(({ row }) => {
    const words = row.name.trim().split(/\s+/);
    return {
      ...row,
      name:
        words.length > 1 ? `${words.slice(0, -1).join(' ')} ${words.at(-1)?.[0] ?? ''}.` : row.name,
    };
  });
  return {
    items,
    page: q.page,
    size: q.size,
    total: list.length,
    months: [...new Set(all.map((r) => r.month))].sort().reverse(),
    summary: {
      count: list.length,
      commission: list
        .filter((r) => r.row.status !== 'cancelled')
        .reduce((n, r) => n + r.row.commission, 0),
      status: list.some((r) => r.row.status === 'recorded')
        ? 'recorded'
        : list.some((r) => r.row.status === 'paid')
          ? 'paid'
          : 'pending',
    },
  };
}

export function mockAffiliateBank(userId: string, bank: AffiliateBank): MockResult<AffiliateBank> {
  const a = syncMockAffiliates().agents.get(userId);
  if (!a) return conflict('Đóng phí thành viên để nhận link giới thiệu');
  a.bank = bank;
  return ok(bank);
}

export function mockAffiliatePayouts(userId: string, q: AffiliatePageQuery): AffiliatePayouts {
  const rows = affiliateMockState().payouts.get(userId) ?? [];
  return {
    items: rows.slice((q.page - 1) * q.size, q.page * q.size),
    page: q.page,
    size: q.size,
    total: rows.length,
  };
}
