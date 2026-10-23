import type {
  BotLogRow,
  BotScript,
  Category,
  FeeRow,
  Notification,
  Persona,
  ServiceRequest,
  SmtpSettings,
  WelcomeMail,
} from '../../api-domains';
import type { MembershipFeeStatus } from '../../enums';
import { categories, communities, members, seed, services, welcomeTemplate } from '../../fixtures';
import { BOT_THREAD_SEED, feeAmountOf, NOTIFICATION_SEED, SMTP_DEFAULTS } from './extras';
import { DAY_MS, iso, MOCK_NOW, isoFromVnDate } from './util';

/** Seed prototype → DTO cho phí, dịch vụ, bot, cài đặt, thông báo */

const YEAR_MS = 365 * DAY_MS;
/** Ngưỡng "Sắp hết hạn" của prototype: 30 ngày */
const EXPIRING_MS = 30 * DAY_MS;

export const memberCodeOf = (userId: string) => {
  const i = members.findIndex((m) => m.id === userId);
  return `TV${String(i + 1).padStart(6, '0')}`;
};

export function feeStatusOf(validUntilMs: number | null, now = MOCK_NOW): MembershipFeeStatus {
  if (validUntilMs === null) return 'pending_payment';
  if (validUntilMs < now) return 'expired';
  return validUntilMs - now <= EXPIRING_MS ? 'expiring' : 'active';
}

/** FEE_SEED: đã đóng tại ngày tham gia; m1 (TK demo) đóng hôm nay; còn lại chờ thanh toán */
export function buildFees(): FeeRow[] {
  const paidSeed = seed.FEE_SEED as Record<string, number>;
  return members.map((m) => {
    const paidMs =
      m.id === 'm1' ? MOCK_NOW : paidSeed[m.id] ? Date.parse(isoFromVnDate(m.date)) : null;
    const until = paidMs === null ? null : paidMs + YEAR_MS;
    const accountType = m.type === 'biz' ? ('business' as const) : ('personal' as const);
    return {
      userId: m.id,
      memberCode: memberCodeOf(m.id),
      fullName: m.name,
      email: m.email,
      phone: m.phone,
      accountType,
      joinedAt: isoFromVnDate(m.date),
      status: feeStatusOf(until),
      paidAt: paidMs === null ? null : iso(paidMs),
      validUntil: until === null ? null : iso(until),
      amount: feeAmountOf(accountType),
    };
  });
}

interface ReqSeed {
  id: string;
  svc: string;
  kind: 'per' | 'biz';
  name: string;
  phone: string;
  email: string;
  org: string;
  tax: string;
  addr: string;
  note: string;
  st: string;
  who: string;
  t: number;
}
const REQ_STATUS: Record<string, ServiceRequest['status']> = {
  new: 'new',
  consult: 'consulting',
  quoted: 'quoted',
  won: 'won',
  lost: 'lost',
  done: 'won', // BUG-041: §9 dừng ở Thành công — dữ liệu cũ done → won
};

export function buildServiceRequests(): ServiceRequest[] {
  const names = new Map(services.map((s) => [s.id, s.n]));
  return (seed.REQ_SEED as ReqSeed[]).map((r) => ({
    code: r.id,
    serviceId: r.svc,
    serviceName: names.get(r.svc) ?? r.svc,
    requesterType: r.kind === 'biz' ? 'business' : 'personal',
    fullName: r.name,
    phone: r.phone,
    email: r.email,
    organization: r.org,
    taxCode: r.tax,
    address: r.addr,
    note: r.note,
    status: REQ_STATUS[r.st] ?? 'new',
    assignee: r.who || null,
    createdAt: iso(r.t),
  }));
}

/** Trường persona mà seed prototype không có — giá trị mặc định của psNew() */
const PERSONA_DEFAULTS = {
  avatarUrl: null,
  gender: '',
  ageRange: '',
  bio: '',
  skills: '',
  postsPerDay: 2,
  activeHours: '8:00 – 22:00',
};

interface PersonaSeed {
  id: string;
  name: string;
  role: string;
  prov: string;
  tone: string;
  groups: string[];
  on: number;
  posts: number;
  col: string;
}
export function buildPersonas(): Persona[] {
  return (seed.PERSONA_SEED as PersonaSeed[]).map((p) => ({
    id: p.id,
    name: p.name,
    title: p.role,
    province: p.prov,
    tone: p.tone,
    groupIds: p.groups,
    enabled: !!p.on,
    postCount: p.posts,
    color: p.col,
    ...PERSONA_DEFAULTS,
  }));
}

interface ScriptSeed {
  id: string;
  topic: string;
  gids: string[];
  lines: { pid: string; text: string }[];
  on: number;
}
export function buildScripts(): BotScript[] {
  return (seed.SCRIPT_SEED as ScriptSeed[]).map((s) => ({
    id: s.id,
    topic: s.topic,
    groupIds: s.gids,
    lines: s.lines.map((l) => ({ personaId: l.pid, body: l.text })),
    enabled: !!s.on,
    type: 'Hỏi đáp',
    delayMinutes: 5,
    runAt: null,
    inviteReal: true,
  }));
}

export function buildBotLog(scripts: BotScript[]): BotLogRow[] {
  const groupName = new Map(communities.map((c) => [c.id, c.name]));
  return BOT_THREAD_SEED.map((t) => {
    const sc = scripts.find((s) => s.id === t.sid);
    return {
      id: t.id,
      scriptId: t.sid,
      topic: sc?.topic ?? '',
      groupNames: (sc?.groupIds ?? []).map((g) => groupName.get(g) ?? g),
      status: t.st,
      createdAt: iso(MOCK_NOW - t.ago),
    };
  });
}

/** Chủ đề AI tự sinh hội thoại của Bot tương tác (AUTO_TOPICS, D-36) */
export const buildBotTopics = (): string[] => [...(seed.AUTO_TOPICS as string[])];

export function buildCategories(): Category[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    scope: c.scope,
    enabled: c.on,
  }));
}

export function buildWelcomeMail(): WelcomeMail {
  const w = welcomeTemplate as typeof welcomeTemplate & {
    loginUrl: string;
    guideUrl: string;
    atts: { title: string; url: string }[];
    rules: string[];
    showPw: boolean;
    showRules: boolean;
    showGuide: boolean;
  };
  return {
    subject: w.subject,
    intro: w.intro,
    loginUrl: w.loginUrl,
    guideUrl: w.guideUrl,
    attachments: w.atts,
    rules: w.rules,
    showRules: w.showRules,
    showGuide: w.showGuide,
  };
}

export const buildSmtp = (): SmtpSettings => ({ ...SMTP_DEFAULTS, hasKey: false });

export function buildNotifications(): Notification[] {
  return NOTIFICATION_SEED.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: iso(MOCK_NOW - n.ago),
  }));
}
