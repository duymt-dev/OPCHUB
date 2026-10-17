import type { ProjectStatus } from '@opchub/db';
import type { AdminReviewDecision } from '@opchub/shared/api-domains';

/** SRS §8: Chờ duyệt → Đang hiển thị | Cần chỉnh sửa | Bị từ chối; Đang hiển thị ⇄ Đã ẩn */
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

/** Chủ dự án sửa được mọi trạng thái trừ "Đã ẩn" (Admin ẩn → phải nhờ Admin hiện lại) */
export const OWNER_EDITABLE: readonly ProjectStatus[] = [
  'draft',
  'needs_changes',
  'pending_review',
  'published',
  'rejected',
];

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'draft',
  'pending_review',
  'published',
  'hidden',
  'needs_changes',
  'rejected',
];
