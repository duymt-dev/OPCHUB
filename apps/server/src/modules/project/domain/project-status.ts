import type { ProjectRevisionStatus, ProjectStatus } from '@opchub/db';
import type { AdminReviewDecision } from '@opchub/shared/api-domains';

/** SRS §9: Chờ duyệt → Đang hiển thị | Cần chỉnh sửa | Bị từ chối; Đang hiển thị ⇄ Đã ẩn */
export const REVIEW_TRANSITIONS: Record<
  AdminReviewDecision,
  { from: ProjectStatus; to: ProjectStatus }
> = {
  approve: { from: 'pending_review', to: 'published' },
  request_changes: { from: 'pending_review', to: 'needs_changes' },
  reject: { from: 'pending_review', to: 'rejected' },
  hide: { from: 'published', to: 'hidden' },
  republish: { from: 'hidden', to: 'published' },
};

/**
 * Chủ dự án sửa được (BUG-033, §9): bỏ `rejected` (Bị từ chối là trạng thái cuối, không có cạnh
 * ra) và `hidden` (Admin ẩn → phải nhờ Admin hiện lại). `published` sửa qua bản sửa (D-18).
 */
export const OWNER_EDITABLE: readonly ProjectStatus[] = [
  'draft',
  'needs_changes',
  'pending_review',
  'published',
];

/** Kết quả lưu của chủ dự án: trạng thái mới của `projects` (TIP-V42-711: luôn ghi trực tiếp) */
export type OwnerSave = { kind: 'project'; status: ProjectStatus };

/**
 * TIP-V42-711 (D-108, thay D-18 + §9 cũ): dự án hiện ngay khi chủ đăng (gửi) — không còn trạng
 * thái trung gian `pending_review` khi tạo mới / gửi lại; sửa dự án `published` ghi đè trực tiếp,
 * KHÔNG qua bản sửa chờ duyệt nữa (Admin vẫn hậu kiểm qua `hide`/`republish`, không đổi). Dự án
 * `pending_review` còn sót từ trước TIP này (chưa có cơ chế xử lý lại) → gửi tiếp cũng lên thẳng
 * `published`. Trạng thái khác (`hidden`, `rejected`) → null (409, giữ như cũ).
 */
export function ownerSaveStatus(cur: ProjectStatus, submit: boolean): OwnerSave | null {
  switch (cur) {
    case 'draft':
    case 'needs_changes':
    case 'pending_review':
      return { kind: 'project', status: submit ? 'published' : cur };
    case 'published':
      return { kind: 'project', status: 'published' };
    default:
      return null;
  }
}

/** Bản sửa còn mở (UQ partial `project_revisions_open`: tối đa 1/dự án) */
export const REVISION_OPEN: readonly ProjectRevisionStatus[] = [
  'draft',
  'pending_review',
  'needs_changes',
];

/** Admin quyết định bản sửa đang Chờ duyệt (REQ-106): dự án vẫn Đang hiển thị trong mọi nhánh */
export const REVISION_TRANSITIONS: Partial<
  Record<AdminReviewDecision, { from: ProjectRevisionStatus; to: ProjectRevisionStatus }>
> = {
  approve: { from: 'pending_review', to: 'approved' },
  request_changes: { from: 'pending_review', to: 'needs_changes' },
  reject: { from: 'pending_review', to: 'rejected' },
};

/** Chủ dự án lưu bản sửa: gửi → Chờ duyệt, không → Nháp */
export const revisionSaveStatus = (submit: boolean): ProjectRevisionStatus =>
  submit ? 'pending_review' : 'draft';

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'draft',
  'pending_review',
  'published',
  'hidden',
  'needs_changes',
  'rejected',
];
