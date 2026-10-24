import type { StoreStatus } from '@opchub/db';

/**
 * V4-608 (D-75, AD-07): chuyển trạng thái gian hàng — luôn cập nhật có điều kiện `WHERE status IN from`.
 * - Chủ: `publish` draft → published, `unpublish` published → draft (không qua duyệt).
 * - Admin: `hide` draft|published → hidden (nhớ `hidden_prev`), `show` hidden → `hidden_prev`.
 */
export const STORE_TRANSITIONS = {
  publish: { from: ['draft'], to: 'published' },
  unpublish: { from: ['published'], to: 'draft' },
  hide: { from: ['draft', 'published'], to: 'hidden' },
} as const satisfies Record<string, { from: readonly StoreStatus[]; to: StoreStatus }>;
export type StoreTransition = keyof typeof STORE_TRANSITIONS;

export const PUBLISH_REQUIRED =
  'Cần tên, giới thiệu (≥ 40 ký tự) và ít nhất 1 sản phẩm / dịch vụ để xuất bản';
export const HIDDEN_BY_ADMIN = 'Gian hàng đang bị Admin ẩn, vui lòng liên hệ quản trị viên';
export const BUSINESS_ONLY = 'Chỉ tài khoản Doanh nghiệp có gian hàng';
export const NO_STORE_YET = 'Gian hàng sẽ được tạo ở lần đóng phí kế tiếp';
