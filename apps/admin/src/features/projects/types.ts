import type { ProjectStatus } from '@opchub/shared';
import type { AdminProject } from '@opchub/shared/api-domains';

export type { AdminProject };

/** Tab của màn kiểm duyệt (thứ tự prototype) ↔ trạng thái dự án SRS §8 */
export const REVIEW_TABS = ['pending', 'live', 'hidden', 'changes', 'rejected', 'draft'] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

export const TAB_STATUS: Record<ReviewTab, ProjectStatus> = {
  pending: 'pending_review',
  live: 'published',
  hidden: 'hidden',
  changes: 'needs_changes',
  rejected: 'rejected',
  draft: 'draft',
};

export const PROJECT_VIEWS = ['grid', 'list'] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

/**
 * Cỡ trang: lựa chọn của prototype (6/9/12/24) + mặc định 10 (AD-07, pjP2). Prototype đặt
 * value=10 không có trong danh sách nên ô chọn hiện "6 / trang" — app hiện đúng "10 / trang".
 */
export const PAGE_SIZES = [6, 9, 10, 12, 24] as const;
export const DEFAULT_PAGE_SIZE = 10;

/** Trạng thái màn trên URL (data-state.md) */
export interface ProjectsParams {
  tab: ReviewTab;
  view: ProjectView;
  page: number;
  size: number;
}

/** Lý do phản hồi người đăng (prototype rvReason) */
export const REVIEW_REASONS = [
  'Thiếu thông tin mô tả',
  'Ảnh bìa không phù hợp',
  'Nội dung quảng cáo / spam',
  'Vi phạm nội quy cộng đồng',
  'Trùng lặp dự án đã có',
] as const;

export type ReviewAction = 'approve' | 'request_changes' | 'reject' | 'hide' | 'republish';

export const INFO_KEYS = [
  'owner',
  'country',
  'category',
  'stage',
  'website',
  'testUrl',
  'repo',
  'visibility',
  'funding',
  'team',
  'groups',
  'date',
] as const;
export type InfoKey = (typeof INFO_KEYS)[number];

export interface InfoRow {
  key: InfoKey;
  value: string;
}
