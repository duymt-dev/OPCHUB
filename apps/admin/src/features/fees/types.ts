import type { MembershipFeeStatus } from '@opchub/shared';

/** Tab trạng thái trên URL (`?status=pending`) — khóa ngắn, đổi sang enum API ở model */
export const FEE_TABS = ['all', 'active', 'pending', 'soon', 'expired'] as const;
export type FeeTab = (typeof FEE_TABS)[number];

export const TAB_STATUS: Record<Exclude<FeeTab, 'all'>, MembershipFeeStatus> = {
  active: 'active',
  pending: 'pending_payment',
  soon: 'expiring',
  expired: 'expired',
};

/** Cỡ trang của prototype: mặc định 10, chọn được 6 / 9 / 12 / 24 */
export const FEE_PAGE_SIZES = [6, 9, 12, 24] as const;
export const FEE_DEFAULT_SIZE = 10;

export interface FeeParams {
  q: string;
  status: FeeTab;
  page: number;
  size: number;
}

/** Màn "Giao dịch cần đối soát": số dòng mỗi lần "Tải thêm"; nút toolbar hiện "9+" nếu còn trang sau */
export const TXN_PAGE_SIZE = 10;
export const TXN_BADGE_SIZE = 9;
