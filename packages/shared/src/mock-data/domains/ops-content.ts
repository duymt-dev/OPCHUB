import type { z } from 'zod';
import type {
  EventItem,
  EventRegistrationResult,
  EventRegistrationRow,
  EventUpsert,
  InvestorInterest,
  ProjectComment,
  ProjectItem,
  createInterestSchema,
  createCommentSchema,
  projectQuerySchema,
  projectUpsertSchema,
} from '../../api-domains';
import { members } from '../../fixtures';
import { avatarOf } from './community';
import { mockDb, nextId } from './store';
import { conflict, includesText, iso, MOCK_NOW, notFound, ok, type MockResult } from './util';

/** Nghiệp vụ mock: sự kiện, dự án, góp ý, nhà đầu tư */

const nameOf = (userId: string) => members.find((m) => m.id === userId)?.name ?? 'Thành viên';

export function listEvents(userId: string | null, mode?: EventItem['mode']): EventItem[] {
  const db = mockDb();
  return db.events
    .filter((e) => !mode || e.mode === mode)
    .map((e) => {
      const mine = !!userId && !!db.eventRegs.get(e.id)?.has(userId);
      // EV-R04 (AT-EV01): link Meet chỉ cho người đã đăng ký — như server
      return { ...e, registeredByMe: mine, meetUrl: mine ? e.meetUrl : null };
    });
}

export function setRegistration(
  userId: string,
  eventId: string,
  register: boolean,
): MockResult<EventRegistrationResult> {
  const db = mockDb();
  const e = db.events.find((x) => x.id === eventId);
  if (!e) return notFound('Không tìm thấy sự kiện');
  const regs = db.eventRegs.get(eventId) ?? new Set<string>();
  db.eventRegs.set(eventId, regs);
  if (register === regs.has(userId)) {
    return conflict(register ? 'Bạn đã đăng ký sự kiện này' : 'Bạn chưa đăng ký sự kiện này');
  }
  if (register && e.registered >= e.seats) return conflict('Sự kiện đã hết chỗ');
  if (register) regs.add(userId);
  else regs.delete(userId);
  e.registered += register ? 1 : -1;
  return ok({ eventId, registered: e.registered, registeredByMe: register });
}

export function upsertEvent(input: EventUpsert, id?: string): MockResult<EventItem> {
  const db = mockDb();
  const d = new Date(Date.parse(input.startsAt) + 7 * 36e5);
  const dow = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getUTCDay()] ?? '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const derived = {
    ...input,
    address: input.address ?? null,
    day: `${dow}, ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
  if (id) {
    const e = db.events.find((x) => x.id === id);
    if (!e) return notFound('Không tìm thấy sự kiện');
    if (input.seats < e.registered) return conflict('Số chỗ nhỏ hơn số người đã đăng ký');
    Object.assign(e, derived);
    return ok({ ...e, registeredByMe: false });
  }
  const e = {
    id: nextId('e'),
    registered: 0,
    coverUrl: null,
    avatars: [],
    meetUrl: null,
    mapUrl: null,
    ...derived,
  };
  db.events.push(e);
  return ok({ ...e, registeredByMe: false });
}

export function deleteEvent(id: string): MockResult<{ id: string }> {
  const db = mockDb();
  const i = db.events.findIndex((e) => e.id === id);
  if (i < 0) return notFound('Không tìm thấy sự kiện');
  db.events.splice(i, 1);
  return ok({ id });
}

export function listRegistrations(eventId: string): MockResult<EventRegistrationRow[]> {
  const db = mockDb();
  if (!db.events.some((e) => e.id === eventId)) return notFound('Không tìm thấy sự kiện');
  const ids = db.eventRegs.get(eventId) ?? new Set<string>();
  const rows = members
    .filter((m) => ids.has(m.id))
    .map((m) => ({
      userId: m.id,
      fullName: m.name,
      email: m.email,
      phone: m.phone,
      status: 'registered' as const,
      registeredAt: iso(MOCK_NOW),
    }));
  return ok(rows);
}

type ProjectFilter = z.infer<typeof projectQuerySchema> & { q?: string | undefined };

export function listProjects(f: ProjectFilter, publicOnly: boolean): ProjectItem[] {
  return mockDb().projects.filter(
    (p) =>
      (!publicOnly || p.status === 'published') &&
      (!f.status || p.status === f.status) &&
      (!f.cat || p.category === f.cat) &&
      (!f.stage || p.stage === f.stage) &&
      (includesText(p.name, f.q) || includesText(p.summary, f.q)),
  );
}

export const myProjects = (userId: string) =>
  mockDb().projects.filter((p) => p.ownerName === nameOf(userId));

export function getProject(id: string): MockResult<ProjectItem> {
  const p = mockDb().projects.find((x) => x.id === id);
  return p ? ok(p) : notFound('Không tìm thấy dự án');
}

export function upsertProject(
  userId: string,
  input: z.output<typeof projectUpsertSchema>,
  id?: string,
): MockResult<ProjectItem> {
  const db = mockDb();
  const status = input.submit ? 'pending_review' : 'draft';
  const fields = {
    name: input.name,
    category: input.category,
    summary: input.summary,
    stage: input.stage,
    country: input.country,
    tags: input.tags,
    website: input.website ?? null,
    status,
  } as const;
  if (id) {
    const p = db.projects.find((x) => x.id === id);
    if (!p || p.ownerName !== nameOf(userId)) return notFound('Không tìm thấy dự án');
    Object.assign(p, fields);
    return ok(p);
  }
  const owner = nameOf(userId);
  const p: ProjectItem = {
    id: nextId('p'),
    ownerName: owner,
    groupName: '',
    tone: 'blue',
    followers: 0,
    audience: 'personal',
    needs: [],
    views: 0,
    reviewNote: null,
    createdAt: iso(MOCK_NOW),
    team: [{ name: owner, role: 'Founder', avatarUrl: null, isOwner: true }],
    funding: null,
    ...fields,
  };
  db.projects.unshift(p);
  return ok(p);
}

export const listComments = (projectId: string) =>
  mockDb().comments.filter((c) => c.projectId === projectId);

export function addComment(
  userId: string,
  projectId: string,
  input: z.output<typeof createCommentSchema>,
): MockResult<ProjectComment> {
  const db = mockDb();
  if (!db.projects.some((p) => p.id === projectId)) return notFound('Không tìm thấy dự án');
  const name = nameOf(userId);
  const c: ProjectComment = {
    id: nextId('k'),
    projectId,
    author: { name, avatarUrl: avatarOf(name), title: '' },
    type: input.type,
    body: input.body,
    likes: 0,
    resolved: false,
    createdAt: iso(MOCK_NOW),
    replies: [],
  };
  db.comments.unshift(c);
  return ok(c);
}

const REVIEW_TO = {
  approve: 'published',
  request_changes: 'needs_changes',
  reject: 'rejected',
  hide: 'hidden',
} as const;

/** Chỉ duyệt khi `pending_review`; ẩn chỉ khi `published` */
export function reviewProject(
  id: string,
  decision: keyof typeof REVIEW_TO,
  note?: string,
): MockResult<ProjectItem> {
  const p = mockDb().projects.find((x) => x.id === id);
  if (!p) return notFound('Không tìm thấy dự án');
  const from = decision === 'hide' ? 'published' : 'pending_review';
  if (p.status !== from) return conflict('Trạng thái dự án không cho phép thao tác này');
  p.status = REVIEW_TO[decision];
  p.reviewNote = note ?? null;
  return ok(p);
}

export function createInterest(
  userId: string,
  projectId: string,
  input: z.output<typeof createInterestSchema>,
): MockResult<InvestorInterest> {
  const db = mockDb();
  const p = db.projects.find((x) => x.id === projectId && x.status === 'published');
  if (!p) return notFound('Không tìm thấy dự án');
  const name = nameOf(userId);
  if (db.interests.some((i) => i.projectId === projectId && i.investorName === name)) {
    return conflict('Bạn đã gửi quan tâm tới dự án này');
  }
  const it: InvestorInterest = {
    id: nextId('iv'),
    projectId,
    projectName: p.name,
    investorName: name,
    avatarUrl: avatarOf(name),
    createdAt: iso(MOCK_NOW),
    ...input,
  };
  db.interests.unshift(it);
  return ok(it);
}

export const listInterests = (kind?: InvestorInterest['kind'], q?: string) =>
  mockDb().interests.filter(
    (i) =>
      (!kind || i.kind === kind) &&
      (includesText(i.investorName, q) || includesText(i.projectName, q)),
  );
