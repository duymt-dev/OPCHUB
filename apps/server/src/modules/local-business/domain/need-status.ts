import type { NeedStatus } from '@opchub/db';

/**
 * V4-609 (REQ-511, AD-07): chuyển trạng thái nhu cầu — luôn cập nhật có điều kiện `WHERE status IN from`.
 * - Chủ: `close` open → closed, `reopen` closed → open (làm mới `updated_at`, prototype `upd = T`).
 * - Admin: `hide` open|closed → hidden (nhớ `hidden_prev`), `show` hidden → `hidden_prev` (Q-V4-609-1).
 */
export const NEED_TRANSITIONS = {
  close: { from: ['open'], to: 'closed' },
  reopen: { from: ['closed'], to: 'open' },
  hide: { from: ['open', 'closed'], to: 'hidden' },
} as const satisfies Record<string, { from: readonly NeedStatus[]; to: NeedStatus }>;
export type NeedTransition = keyof typeof NEED_TRANSITIONS;

/** Chủ chỉ xoá nhu cầu chưa bị Admin ẩn (Q-V4-609-2) */
export const NEED_DELETABLE: readonly NeedStatus[] = ['open', 'closed'];
