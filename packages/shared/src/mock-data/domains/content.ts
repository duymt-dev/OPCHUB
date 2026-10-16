import type {
  EventItem,
  InvestorInterest,
  ProjectComment,
  ProjectFunding,
  ProjectItem,
} from '../../api-domains';
import type { ProjectStage, ProjectStatus } from '../../enums';
import { events, projects, seed } from '../../fixtures';
import { avatarOf } from './community';
import { PROJECT_EXTRAS, PUBLISHED_PROJECTS } from './extras';
import { avatarUrl, iso, isoFromVnDate, isoFromVnDayTime } from './util';

/** Seed prototype → DTO cho sự kiện, dự án, góp ý, quan tâm đầu tư */

const EV_ADDR = seed.EV_ADDR as Record<string, { address: string }>;

export function buildEvents(): Omit<EventItem, 'registeredByMe'>[] {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    mode: e.mode === 'Online' ? 'online' : 'offline',
    day: e.day,
    time: e.time,
    place: e.place,
    seats: e.seats,
    registered: e.reg,
    description: e.desc,
    startsAt: isoFromVnDayTime(e.day, e.time),
    address: EV_ADDR[e.id]?.address ?? null,
  }));
}

const STAGE: Record<string, ProjectStage> = {
  'Ý tưởng': 'idea',
  MVP: 'mvp',
  'Tăng trưởng': 'growth',
  'Đã ra mắt': 'launched',
};

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
      stage: STAGE[p.stage ?? ex?.stage ?? ''] ?? 'idea',
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
      status: 'sent',
      createdAt: iso(x.t),
    })),
  );
}
