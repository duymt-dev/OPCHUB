import type {
  AdminProjectRevision,
  ProjectCard,
  ProjectItem,
  ProjectRevisionStatus,
} from '../../api-domains';
import { displayCover, type ProjectExt, extOf } from './project-store';
import { mockDb, type MockDb, nextId } from './store';
import { iso } from './util';

/**
 * Bản sửa dự án Đang hiển thị ở CSDL giả (REQ-106, D-18) — cùng luật với
 * `ProjectRevisionService` của server: tối đa 1 bản mở / dự án, sửa tiếp cập nhật cùng bản; duyệt
 * áp nội dung, từ chối / yêu cầu chỉnh sửa giữ bản đang hiển thị. WeakMap theo MockDb.
 */

export type RevisionFields = Pick<
  ProjectItem,
  'name' | 'category' | 'summary' | 'stage' | 'audience' | 'tags' | 'website' | 'team' | 'funding'
>;
export type RevisionExt = Omit<ProjectExt, 'updatedAt'>;

export interface MockRevision {
  id: string;
  status: ProjectRevisionStatus;
  reviewNote: string | null;
  updatedAt: string;
  decidedAt: string | null;
  fields: RevisionFields;
  ext: RevisionExt;
  groupName: string;
}

const OPEN: readonly ProjectRevisionStatus[] = ['draft', 'pending_review', 'needs_changes'];
const stores = new WeakMap<MockDb, Map<string, MockRevision[]>>();

function store(): Map<string, MockRevision[]> {
  const db = mockDb();
  let s = stores.get(db);
  if (!s) {
    s = new Map();
    stores.set(db, s);
  }
  return s;
}

const listOf = (projectId: string) => store().get(projectId) ?? [];

export const openRevision = (projectId: string) =>
  listOf(projectId).find((r) => OPEN.includes(r.status));

export const pendingRevision = (projectId: string) =>
  listOf(projectId).find((r) => r.status === 'pending_review');

/** Bản sửa gần nhất chưa áp (mở hoặc bị từ chối) */
export const latestUnapplied = (projectId: string) =>
  listOf(projectId).find((r) => r.status !== 'approved');

export const revisionRef = (projectId: string): ProjectCard['revision'] => {
  const r = latestUnapplied(projectId);
  return r ? { status: r.status, reviewNote: r.reviewNote } : null;
};

/** Upsert bản sửa mở: gửi → Chờ duyệt, không → Nháp */
export function saveRevision(
  projectId: string,
  submit: boolean,
  body: Pick<MockRevision, 'fields' | 'ext' | 'groupName'>,
): MockRevision {
  const now = iso(Date.now());
  const status: ProjectRevisionStatus = submit ? 'pending_review' : 'draft';
  const cur = openRevision(projectId);
  if (cur) {
    Object.assign(cur, body, { status, updatedAt: now });
    return cur;
  }
  const rev: MockRevision = {
    id: nextId('rev'),
    status,
    reviewNote: null,
    updatedAt: now,
    decidedAt: null,
    ...body,
  };
  store().set(projectId, [rev, ...listOf(projectId)]);
  return rev;
}

/** Admin quyết định bản sửa Chờ duyệt (luật 7: chỉ từ `pending_review`); duyệt → áp nội dung */
export function decideRevision(
  p: ProjectItem,
  decision: 'approve' | 'request_changes' | 'reject',
  note?: string,
): MockRevision | null {
  const rev = pendingRevision(p.id);
  if (!rev) return null;
  const to: Record<typeof decision, ProjectRevisionStatus> = {
    approve: 'approved',
    request_changes: 'needs_changes',
    reject: 'rejected',
  };
  rev.status = to[decision];
  rev.decidedAt = iso(Date.now());
  if (note) rev.reviewNote = note;
  if (decision === 'approve') {
    Object.assign(p, rev.fields, { groupName: rev.groupName });
    Object.assign(extOf(p), rev.ext, { updatedAt: rev.decidedAt });
  }
  return rev;
}

/** Mốc "Cập nhật được duyệt" (BUG-038): ≤ 5 bản mới nhất */
export const approvedDates = (projectId: string) =>
  listOf(projectId)
    .filter((r) => r.status === 'approved' && r.decidedAt)
    .map((r) => r.decidedAt ?? '')
    .slice(0, 5);

export const pendingRevisionCount = () =>
  [...store().values()].reduce(
    (n, list) => n + list.filter((r) => r.status === 'pending_review').length,
    0,
  );

export function toAdminRevision(p: ProjectItem, r: MockRevision): AdminProjectRevision {
  return {
    id: r.id,
    status: r.status,
    reviewNote: r.reviewNote,
    updatedAt: r.updatedAt,
    name: r.fields.name,
    category: r.fields.category,
    summary: r.fields.summary,
    stage: r.fields.stage,
    tags: r.fields.tags,
    website: r.fields.website,
    coverUrl: displayCover(p.id, r.ext.coverUrl),
    description: r.ext.description || r.fields.summary,
    testUrl: r.ext.testUrl,
    repo: r.ext.repo,
    visibility: r.ext.visibility,
    team: r.fields.team,
    funding: r.fields.funding,
  };
}

/**
 * Chỉ cho MSW/e2e (D-63, như V2Q-78): Admin và Portal là hai CSDL giả, nên spec Admin dựng sẵn
 * bản sửa Chờ duyệt bằng cookie `opchub-mock-revision=<projectId>:<tên mới>` (server: tạo qua API).
 */
export const REVISION_SEED_COOKIE = 'opchub-mock-revision';

export function seedRevisionFromCookie(raw: string | undefined): void {
  if (!raw) return;
  const text = decodeURIComponent(raw);
  const at = text.indexOf(':');
  if (at < 1) return;
  const id = text.slice(0, at);
  const name = text.slice(at + 1).trim();
  const p = mockDb().projects.find((x) => x.id === id);
  if (!p || !name || p.status !== 'published' || listOf(id).length) return;
  const e = extOf(p);
  const ext: RevisionExt = {
    coverUrl: e.coverUrl,
    description: e.description,
    visibility: e.visibility,
    testUrl: e.testUrl,
    repo: e.repo,
    deckUrl: e.deckUrl,
    groupIds: e.groupIds,
    contactEmail: e.contactEmail,
    contactPhone: e.contactPhone,
    contactAddress: e.contactAddress,
    highlights: e.highlights,
    gallery: e.gallery,
  };
  saveRevision(id, true, {
    fields: {
      name,
      category: p.category,
      summary: p.summary,
      stage: p.stage,
      audience: p.audience,
      tags: p.tags,
      website: p.website,
      team: p.team,
      funding: p.funding,
    },
    ext,
    groupName: p.groupName,
  });
}
