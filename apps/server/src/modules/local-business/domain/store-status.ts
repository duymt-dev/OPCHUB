import type { StoreStatus } from '@opchub/db';
import { STORE_MESSAGES } from '@opchub/shared/api-domains';

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

export const {
  hiddenByAdmin: HIDDEN_BY_ADMIN,
  businessOnly: BUSINESS_ONLY,
  noStoreYet: NO_STORE_YET,
} = STORE_MESSAGES;
