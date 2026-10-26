import type { z } from 'zod';
import type {
  createCommentSchema,
  createInterestPortalSchema,
  InvestorInterest,
  ProjectCommentView,
} from '../../api-domains';
import { isFundraisingActive } from './fundraising';
import { avatarOf } from './community';
import { visibleProjects } from './ops-project-portal';
import { extOf, nameOfUser, projectState, SEED_T0 } from './project-store';
import { mockDb, nextId } from './store';
import { conflict, iso, notFound, ok, type MockResult } from './util';

/** Góp ý (bình luận) + quan tâm đầu tư của màn Chi tiết dự án (QT-09, BR-09) */

const forbidden = (message: string): MockResult<never> => ({
  ok: false,
  status: 403,
  code: 'FORBIDDEN',
  message,
});

/** Góp ý seed lấy mốc theo lúc nạp trang như prototype (t = now - offset) */
const shift = (at: string, now: number) => iso(now - (SEED_T0 - Date.parse(at)));

export function portalComments(
  userId: string,
  projectId: string,
  now: number,
): ProjectCommentView[] {
  const s = projectState();
  return mockDb()
    .comments.filter((c) => c.projectId === projectId)
    .map((c) => {
      const seeded = s.seededComments.has(c.id);
      return {
        ...c,
        createdAt: seeded ? shift(c.createdAt, now) : c.createdAt,
        replies: c.replies.map((r) => ({
          ...r,
          createdAt:
            seeded && Date.parse(r.createdAt) < SEED_T0 ? shift(r.createdAt, now) : r.createdAt,
        })),
        likedByMe: !!s.likes.get(c.id)?.has(userId),
      };
    });
}

export function postPortalComment(
  userId: string,
  projectId: string,
  input: z.output<typeof createCommentSchema>,
): MockResult<ProjectCommentView> {
  const db = mockDb();
  const p = visibleProjects(userId).find((x) => x.id === projectId);
  if (!p) return notFound('Không tìm thấy dự án');
  const name = nameOfUser(userId);
  const c = {
    id: nextId('k'),
    projectId,
    author: {
      name,
      avatarUrl: avatarOf(name),
      title: p.ownerName === name ? 'Chủ dự án' : 'Thành viên OPC Hub',
    },
    type: input.type,
    body: input.body,
    likes: 0,
    resolved: false,
    createdAt: iso(Date.now()),
    replies: [],
  };
  db.comments.unshift(c);
  return ok({ ...c, likedByMe: false });
}

function findComment(userId: string, commentId: string) {
  const c = mockDb().comments.find((x) => x.id === commentId);
  const p = c && visibleProjects(userId).find((x) => x.id === c.projectId);
  return c && p ? { c, p } : null;
}

export function likeComment(userId: string, commentId: string, like: boolean) {
  const f = findComment(userId, commentId);
  if (!f) return notFound('Không tìm thấy góp ý');
  const s = projectState();
  const set = s.likes.get(commentId) ?? new Set<string>();
  s.likes.set(commentId, set);
  if (like !== set.has(userId)) {
    if (like) set.add(userId);
    else set.delete(userId);
    f.c.likes += like ? 1 : -1;
  }
  return ok({ likes: f.c.likes, likedByMe: like });
}

export function replyComment(userId: string, commentId: string, body: string) {
  const f = findComment(userId, commentId);
  if (!f) return notFound('Không tìm thấy góp ý');
  const name = nameOfUser(userId);
  const r = {
    author: { name, avatarUrl: avatarOf(name) },
    body,
    isOwner: f.p.ownerName === name,
    createdAt: iso(Date.now()),
  };
  f.c.replies.push(r);
  return ok(r);
}

/** Chỉ chủ dự án đánh dấu đã tiếp nhận */
export function resolveComment(userId: string, commentId: string, resolved: boolean) {
  const f = findComment(userId, commentId);
  if (!f) return notFound('Không tìm thấy góp ý');
  if (f.p.ownerName !== nameOfUser(userId)) return forbidden('Chỉ chủ dự án được thao tác');
  f.c.resolved = resolved;
  return ok({ resolved });
}

/**
 * BR-09: một người một quan tâm/dự án; số tiền ≥ tối thiểu; không tự quan tâm dự án mình.
 * Idempotency-Key trùng → trả lại kết quả cũ (không tạo bản ghi mới).
 */
export function createPortalInterest(
  userId: string,
  projectId: string,
  input: z.output<typeof createInterestPortalSchema>,
  key: string,
): MockResult<InvestorInterest> {
  const db = mockDb();
  const s = projectState();
  const prev = s.idempotency.get(key);
  const again = prev && db.interests.find((i) => i.id === prev);
  if (again) return ok(again);
  const p = visibleProjects(userId).find((x) => x.id === projectId);
  if (!p?.funding || !isFundraisingActive(p.id)) return notFound('Dự án không gọi vốn');
  const name = nameOfUser(userId);
  if (p.ownerName === name) return forbidden('Không thể quan tâm đầu tư dự án của chính bạn');
  if (db.interests.some((i) => i.projectId === projectId && i.investorName === name))
    return conflict('Bạn đã gửi quan tâm cho dự án này');
  if (p.funding.minTicket > 0 && input.amount < p.funding.minTicket)
    return conflict('Số tiền thấp hơn mức đầu tư tối thiểu');
  const it: InvestorInterest = {
    id: nextId('iv'),
    projectId,
    projectName: p.name,
    investorName: name,
    avatarUrl: avatarOf(name),
    kind: input.kind,
    organization: input.kind === 'individual' ? '' : input.organization,
    phone: input.phone,
    amount: input.amount,
    currency: p.funding.currency,
    message: input.message,
    createdAt: iso(Date.now()),
  };
  db.interests.unshift(it);
  s.idempotency.set(key, it.id);
  s.contactNames.set(it.id, input.contactName);
  return ok(it);
}

/** Chủ dự án xem danh sách nhà đầu tư quan tâm (thứ tự gửi) */
export function projectInterests(
  userId: string,
  projectId: string,
): MockResult<InvestorInterest[]> {
  const p = mockDb().projects.find((x) => x.id === projectId);
  if (!p || !extOf(p)) return notFound('Không tìm thấy dự án');
  if (p.ownerName !== nameOfUser(userId)) return forbidden('Chỉ chủ dự án xem được');
  return ok(mockDb().interests.filter((i) => i.projectId === projectId));
}
