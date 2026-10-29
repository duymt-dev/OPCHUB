import type { AccountType } from '../enums';

/**
 * D-68 (SRS-4.0 §27.1, UP-12): gói thành viên theo loại tài khoản. Giá KHÔNG nằm ở đây — D-94 5A:
 * đọc từ Cấu hình bảng giá (`./pricing`, server `PriceConfigService`, FE `GET /public/price-config`).
 */
export const MEMBERSHIP_PLAN = ['personal', 'business'] as const;
export type MembershipPlan = (typeof MEMBERSHIP_PLAN)[number];

/**
 * Giá cũ D-53 (600.000) của các kỳ đã trả trước V4 — chỉ dùng cho kỳ lịch sử / dữ liệu demo.
 * D-116 (thay D-69): khoản `pending_payment` cũ đã chuyển sang trial / expired với giá gói hiện hành.
 */
export const LEGACY_ANNUAL_FEE = 600_000;

/** D-68: gói theo loại TK; Nhà đầu tư không đóng phí (D-14) */
export const planOf = (t: AccountType): MembershipPlan | null =>
  t === 'business' ? 'business' : t === 'personal' ? 'personal' : null;
