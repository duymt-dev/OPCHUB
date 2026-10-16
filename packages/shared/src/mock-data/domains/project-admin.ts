import type {
  AdminProject,
  AdminReviewDecision,
  ProjectBulkAction,
  ProjectBulkResult,
  ProjectCounts,
  ProjectItem,
} from '../../api-domains';
import { PROJECT_STATUS, type ProjectStatus } from '../../enums';
import { seed } from '../../fixtures';
import { recordAudit } from './group-admin';
import { displayCover, extOf, projectState, seedDescription } from './project-store';
import { mockDb, type MockDb } from './store';
import { conflict, notFound, ok, type MockResult } from './util';

/**
 * Màn Admin "Kiểm duyệt dự án" (G5b, D-51 → D-57). Chuyển trạng thái theo SRS §8 —
 * chỉ chuyển hợp lệ, cập nhật có điều kiện như `WHERE status = <from>` (luật 7) — và ghi
 * audit_logs (luật 10). Nổi bật tuần giữ trong WeakMap theo MockDb.
 */

interface Transition {
  from: readonly ProjectStatus[];
  to: ProjectStatus;
}

/** SRS §8: Nháp → Chờ duyệt → Đang hiển thị ⇄ Đã ẩn | Cần chỉnh sửa → Chờ duyệt | Bị từ chối */
export const PROJECT_TRANSITIONS: Record<AdminReviewDecision, Transition> = {
  approve: { from: ['pending_review'], to: 'published' },
  request_changes: { from: ['pending_review'], to: 'needs_changes' },
  reject: { from: ['pending_review'], to: 'rejected' },
  hide: { from: ['published'], to: 'hidden' },
  /** "Xuất bản lại" dự án đã ẩn (D-55); bị từ chối thì chủ dự án phải gửi lại */
  republish: { from: ['hidden'], to: 'published' },
};

const BULK_DECISION: Record<Exclude<ProjectBulkAction, 'delete'>, AdminReviewDecision[]> = {
  publish: ['approve', 'republish'],
  hide: ['hide'],
};

const featuredBy = new WeakMap<MockDb, { id: string | null }>();
function feature() {
  const db = mockDb();
  let f = featuredBy.get(db);
  if (!f) {
    f = { id: null };
    featuredBy.set(db, f);
  }
  return f;
}

const groupNameById = new Map(seed.COMMS.map((c) => [c.id, c.name]));
const shareSeed = new Map(
  seed.PROJECTS.map((p) => [p.id, Array.isArray(p.shareTo) ? (p.shareTo as string[]) : null]),
);
/** Seed không khai báo đội ngũ: hồ sơ duyệt chỉ ghi chủ dự án (đội ngũ mẫu chỉ để Portal minh hoạ) */
const noTeamSeed = new Set(seed.PROJECTS.filter((p) => !p.team).map((p) => p.id));

function toAdmin(p: ProjectItem): AdminProject {
  const e = extOf(p);
  const shared = shareSeed.get(p.id);
  const fromExt = e.groupIds.map((g) => groupNameById.get(g)).filter((x): x is string => !!x);
  const team = noTeamSeed.has(p.id) ? [] : p.team;
  return {
    ...p,
    team,
    coverUrl: displayCover(p.id, e.coverUrl),
    description: e.description || seedDescription(p),
    testUrl: e.testUrl,
    repo: e.repo,
    visibility: e.visibility,
    groupNames: shared ?? (fromExt.length ? fromExt : [p.groupName].filter(Boolean)),
    featured: feature().id === p.id,
  };
}

export function listAdminProjects(status: ProjectStatus | undefined, q?: string): AdminProject[] {
  projectState();
  const needle = q?.toLowerCase();
  return mockDb()
    .projects.filter(
      (p) =>
        (!status || p.status === status) &&
        (!needle ||
          p.name.toLowerCase().includes(needle) ||
          p.ownerName.toLowerCase().includes(needle)),
    )
    .map(toAdmin);
}

export function projectCounts(): ProjectCounts {
  const counts = Object.fromEntries(PROJECT_STATUS.map((s) => [s, 0])) as ProjectCounts;
  for (const p of mockDb().projects) counts[p.status] = (counts[p.status] ?? 0) + 1;
  return counts;
}

export function getAdminProject(id: string): MockResult<AdminProject> {
  const p = mockDb().projects.find((x) => x.id === id);
  return p ? ok(toAdmin(p)) : notFound('Không tìm thấy dự án');
}

/** Hàm chuyển trạng thái duy nhất của domain dự án phía admin */
export function transitionProject(
  actorId: string,
  id: string,
  decision: AdminReviewDecision,
  note?: string,
): MockResult<AdminProject> {
  const p = mockDb().projects.find((x) => x.id === id);
  if (!p) return notFound('Không tìm thấy dự án');
  const t = PROJECT_TRANSITIONS[decision];
  if (!t.from.includes(p.status)) return conflict('Trạng thái dự án không cho phép thao tác này');
  p.status = t.to;
  if (note) p.reviewNote = note;
  const f = feature();
  if (t.to !== 'published' && f.id === id) f.id = null;
  recordAudit(actorId, `project.${decision}`, id, note ?? '');
  return ok(toAdmin(p));
}

export function deleteProjects(actorId: string, ids: string[]): ProjectBulkResult {
  const db = mockDb();
  const done = ids.filter((id) => db.projects.some((p) => p.id === id));
  db.projects = db.projects.filter((p) => !done.includes(p.id));
  db.comments = db.comments.filter((c) => !done.includes(c.projectId));
  const f = feature();
  if (f.id && done.includes(f.id)) f.id = null;
  for (const id of done) recordAudit(actorId, 'project.delete', id);
  return { done, skipped: ids.filter((id) => !done.includes(id)) };
}

/** Bulk: dự án không ở trạng thái hợp lệ thì bỏ qua (trả về `skipped`) */
export function bulkProjects(
  actorId: string,
  ids: string[],
  action: ProjectBulkAction,
): ProjectBulkResult {
  if (action === 'delete') return deleteProjects(actorId, ids);
  const done: string[] = [];
  const skipped: string[] = [];
  for (const id of ids) {
    const p = mockDb().projects.find((x) => x.id === id);
    const d = BULK_DECISION[action].find(
      (k) => p && PROJECT_TRANSITIONS[k].from.includes(p.status),
    );
    if (d && transitionProject(actorId, id, d).ok) done.push(id);
    else skipped.push(id);
  }
  return { done, skipped };
}

/** Nổi bật tuần: chỉ dự án đang hiển thị; `null` bỏ nổi bật */
export function setFeaturedProject(
  actorId: string,
  id: string | null,
): MockResult<{ projectId: string | null }> {
  if (id) {
    const p = mockDb().projects.find((x) => x.id === id);
    if (!p) return notFound('Không tìm thấy dự án');
    if (p.status !== 'published') return conflict('Chỉ đặt nổi bật cho dự án đang hiển thị');
  }
  const f = feature();
  recordAudit(actorId, id ? 'project.feature' : 'project.unfeature', id ?? f.id ?? '');
  f.id = id;
  return ok({ projectId: id });
}
