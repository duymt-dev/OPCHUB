import type {
  EventItem,
  InvestorInterest,
  ProjectComment,
  ProjectFunding,
  ProjectItem,
} from '../../api-domains';
import type { ProjectStatus } from '../../enums';
import { events, projects, seed } from '../../fixtures';
import { avatarOf, sampleAvatars } from './community';
import { MY_EVENT_REGS, PROJECT_EXTRAS, PUBLISHED_PROJECTS } from './extras';
import { AUDIENCE_OF, seedNeeds, seedViews, STAGE_OF } from './project-v4-seed';
import { avatarUrl, iso, isoFromVnDate, isoFromVnDayTime } from './util';

/** Seed prototype → DTO cho sự kiện, dự án, góp ý, quan tâm đầu tư */

const EV_ADDR = seed.EV_ADDR as Record<string, { address: string; mapUrl?: string }>;

/**
 * EV-R01 seed: link Meet mẫu như prototype `MEET(e)` (băm id → `xxx-xxxx-xxx`) — chỉ là dữ liệu mẫu,
 * app không tự sinh link (Admin dán link thật, D-59). Prototype gắn link cho mọi sự kiện.
 */
export function prototypeMeetUrl(id: string): string {
  const a = 'abcdefghijkmnopqrstuvwxyz';
  let x = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const g = (n: number) => {
    let o = '';
    for (let k = 0; k < n; k++) {
      o += a[x % 25] ?? '';
      x = Math.floor(x / 25) + k * 7919 + 13;
    }
    return o;
  };
  return `https://meet.google.com/${g(3)}-${g(4)}-${g(3)}`;
}

/** `meetUrl` là link gốc (Admin thấy); `listEvents` ẩn với người chưa đăng ký (EV-R04) */
export function buildEvents(): Omit<EventItem, 'registeredByMe'>[] {
  return events.map((e, order) => ({
    id: e.id,
    title: e.title,
    mode: e.mode === 'Online' ? 'online' : 'offline',
    day: e.day,
    time: e.time,
    place: e.place,
    seats: e.seats,
    // Seed `reg` chưa gồm lượt đăng ký sẵn của TK demo (prototype: reg + 1 khi đã đăng ký)
    registered: e.reg + (MY_EVENT_REGS.includes(e.id) ? 1 : 0),
    description: e.desc,
    startsAt: isoFromVnDayTime(e.day, e.time),
    address: EV_ADDR[e.id]?.address ?? null,
    coverUrl: null,
    // Prototype thẻ sự kiện: D_P[(k*4 + j*5 + 1) % n]
    avatars: sampleAvatars(order, 4, 5, 1),
    meetUrl: prototypeMeetUrl(e.id),
    mapUrl: EV_ADDR[e.id]?.mapUrl || null,
  }));
}

const STATUS: Record<string, ProjectStatus> = {
  pending: 'pending_review',
  changes: 'needs_changes',
  live: 'published',
};

interface FundSeed {
  on: boolean;
  amt: number;
  cur: 'VND' | 'USD';
  eq: number;
  round: string;
  type: string;
  end: string;
  min: number;
  use: string;
  raised: number;
}
const FUND = seed.FUND_SEED as Record<string, FundSeed>;

function fundingOf(id: string): ProjectFunding | null {
  const f = FUND[id];
  if (!f?.on) return null;
  return {
    amount: f.amt,
    currency: f.cur,
    equityPercent: f.eq,
    round: f.round,
    instrument: f.type,
    endsAt: `${f.end}T00:00:00.000Z`,
    minTicket: f.min,
    raised: f.raised,
    useOfFunds: f.use,
  };
}

export function buildProjects(): ProjectItem[] {
  return projects.map((p) => {
    const ex = PROJECT_EXTRAS[p.id];
    const tags = Array.isArray(p.tags) ? (p.tags as string[]) : (ex?.tags ?? []);
    const status: ProjectStatus = PUBLISHED_PROJECTS.includes(p.id)
      ? 'published'
      : (STATUS[p.status] ?? 'hidden');
    const team = p.team ?? [{ name: p.owner, role: 'Founder', ph: ex?.ph ?? null, owner: true }];
    return {
      id: p.id,
      name: p.name,
      category: p.cat,
      ownerName: p.owner,
      groupName: p.comm,
      summary: p.short,
      tone: p.tone,
      status,
      // D-89 (v4): giai đoạn 5 mức qua `SMAP` (p1–p6 lấy từ EX như prototype `mapP`)
      stage: STAGE_OF[p.stage ?? ex?.stage ?? ''] ?? 'idea',
      audience: AUDIENCE_OF[typeof p.who === 'string' ? p.who : ''] ?? 'personal',
      needs: seedNeeds(p.id),
      views: seedViews(p.id),
      country: typeof p.country === 'string' ? p.country : (ex?.country ?? 'Việt Nam'),
      tags,
      website: typeof p.web === 'string' && p.web ? p.web : null,
      followers: ex?.followers ?? 0,
      reviewNote: typeof p.reviewNote === 'string' ? p.reviewNote : null,
      createdAt: isoFromVnDate(p.date),
      team: team.map((t) => ({
        name: t.name,
        role: t.role,
        avatarUrl: avatarUrl(t.ph),
        isOwner: !!t.owner,
      })),
      funding: fundingOf(p.id),
    };
  });
}

interface CommentSeed {
  id: string;
  who: string;
  ph: string;
  role: string;
  type: string;
  text: string;
  t: number;
  likes: number;
  done?: boolean;
  replies: { who: string; ph: string; text: string; t: number; isOwner?: boolean }[];
}
const COMMENT_TYPE: Record<string, ProjectComment['type']> = {
  'Góp ý': 'feedback',
  'Câu hỏi': 'question',
  'Đề xuất hợp tác': 'partnership',
};

export function buildComments(): ProjectComment[] {
  const all = seed.PJ_CMT as Record<string, CommentSeed[]>;
  return Object.entries(all).flatMap(([projectId, list]) =>
    list.map((c) => ({
      id: c.id,
      projectId,
      author: { name: c.who, avatarUrl: avatarUrl(c.ph), title: c.role },
      type: COMMENT_TYPE[c.type] ?? 'feedback',
      body: c.text,
      likes: c.likes,
      resolved: !!c.done,
      createdAt: iso(c.t),
      replies: c.replies.map((r) => ({
        author: { name: r.who, avatarUrl: avatarUrl(r.ph) },
        body: r.text,
        isOwner: !!r.isOwner,
        createdAt: iso(r.t),
      })),
    })),
  );
}

interface InterestSeed {
  who: string;
  ph: string;
  kind: 'angel' | 'biz' | 'fund';
  phone: string;
  org: string;
  amt: number;
  cur: 'VND' | 'USD';
  msg: string;
  t: number;
}
const KIND = { angel: 'individual', biz: 'business', fund: 'fund' } as const;

export function buildInterests(): InvestorInterest[] {
  const all = seed.INV_SEED as Record<string, InterestSeed[]>;
  const names = new Map(projects.map((p) => [p.id, p.name]));
  return Object.entries(all).flatMap(([projectId, list]) =>
    list.map((x, i) => ({
      id: `${projectId}-i${i + 1}`,
      projectId,
      projectName: names.get(projectId) ?? projectId,
      investorName: x.who,
      avatarUrl: avatarUrl(x.ph) ?? avatarOf(x.who),
      kind: KIND[x.kind],
      organization: x.org,
      phone: x.phone,
      amount: x.amt,
      currency: x.cur,
      message: x.msg,
      createdAt: iso(x.t),
    })),
  );
}
