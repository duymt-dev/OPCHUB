import type { Me } from '../../api';
import type {
  AffiliateBank,
  AffiliateCodeResult,
  AffiliatePageQuery,
  AffiliatePayouts,
  AffiliateReferrals,
  MyAffiliate,
} from '../../api-domains';
import { mockDb, type MockDb } from './store';
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
const usable = (userId: string) => {
  const fee = mockDb().fees.find((f) => f.userId === userId);
  return (
    !!fee?.validUntil &&
    Date.parse(fee.validUntil) >= Date.now() &&
    (fee.status === 'active' || fee.status === 'expiring')
  );
};
const MESSAGES = {
  not_found: 'Mã giới thiệu không tồn tại',
  self: 'Không thể dùng mã giới thiệu của chính bạn',
  paused: 'Mã giới thiệu đang tạm dừng (đại lý hết hạn phí thành viên)',
} as const;

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
    const seed = db.fees
      .filter((f) => f.paidAt && (f.status === 'active' || f.status === 'expiring'))
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
    states.set(db, state);
  }
  return state;
}

function syncPaid() {
  const s = affiliateMockState();
  for (const f of mockDb().fees) {
    if (f.paidAt && f.paidAt !== s.knownFees.get(f.userId) && !s.agents.has(f.userId))
      s.agents.set(f.userId, {
        userId: f.userId,
        code: `OPC${++s.seq}`,
        name: f.fullName,
        email: f.email,
        rate: 20,
        bank: null,
      });
    s.knownFees.set(f.userId, f.paidAt);
  }
  for (const r of s.referrals.values()) {
    const fee = mockDb().fees.find((f) => f.userId === r.userId);
    if (r.row.status !== 'pending' || !fee?.paidAt) continue;
    if (!usable(r.agentId)) {
      r.row.status = 'void';
      continue;
    }
    r.row.status = 'recorded';
    r.row.rate = s.agents.get(r.agentId)?.rate ?? 20;
    r.row.commission = Math.floor((600000 * r.row.rate) / 100);
    r.row.date = fee.paidAt;
    r.month = monthOf(Date.parse(fee.paidAt));
  }
  return s;
}

export function checkMockAffiliate(code: string, email = ''): AffiliateCodeResult {
  const a = [...syncPaid().agents.values()].find((a) => a.code === code.trim().toUpperCase());
  const reason = !a
    ? 'not_found'
    : a.email.toLowerCase() === email.trim().toLowerCase()
      ? 'self'
      : !usable(a.userId)
        ? 'paused'
        : null;
  if (reason) return { valid: false, reason, message: MESSAGES[reason] };
  return { valid: true, affiliateName: a?.name ?? '', cookieDays: 30 };
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
      memberCode: `TV${++s.seq}`,
      fullName: me.fullName,
      email: me.email,
      phone: '',
      accountType: me.accountType,
      joinedAt: new Date().toISOString(),
      status: 'pending_payment',
      paidAt: null,
      validUntil: null,
      amount: 600000,
    });
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
      plan: 'Phí thành viên 12 tháng',
      date: new Date().toISOString(),
      feeAmount: 600000,
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
  const s = syncPaid(),
    a = s.agents.get(userId);
  const policy = {
    rate: a?.rate ?? 20,
    perAmount: Math.floor((600000 * (a?.rate ?? 20)) / 100),
    cookieDays: 30,
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
    state: usable(userId) ? 'active' : 'paused',
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
  const all = [...syncPaid().referrals.values()].filter((r) => r.agentId === userId);
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
  const a = syncPaid().agents.get(userId);
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
