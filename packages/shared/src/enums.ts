/** Enum trạng thái — coding-packs/standards/global/domain-glossary.md */
export const USER_STATUS = ['active', 'locked'] as const;
/** D-94 1A: `trial` = miễn phí 3 tháng; `pending_payment` chỉ còn ở dữ liệu cũ (D-116) */
export const MEMBERSHIP_FEE_STATUS = [
  'trial',
  'pending_payment',
  'active',
  'expiring',
  'expired',
] as const;
/** D-71: vào nhóm ngay, không còn trạng thái chờ duyệt */
export const GROUP_MEMBER_STATUS = ['member', 'left', 'removed'] as const;
export const PROJECT_STATUS = [
  'draft',
  'pending_review',
  'published',
  'hidden',
  'needs_changes',
  'rejected',
] as const;
/** D-89 (v4): 5 giai đoạn — Ý tưởng / Đang phát triển / Có mô hình thử nghiệm / Đang triển khai / Đã thương mại hóa */
export const PROJECT_STAGE = ['idea', 'developing', 'mvp', 'launched', 'growth'] as const;
/** D-89 (v4): đối tượng tham gia của dự án */
export const PROJECT_AUDIENCE = ['student', 'personal', 'organization', 'business'] as const;
/** D-89 (v4): nhu cầu kết nối (bộ lọc + nhãn thẻ) */
export const PROJECT_NEEDS = ['customers', 'partners', 'investors', 'experts', 'pilot'] as const;
export const ACCOUNT_TYPE = ['personal', 'business', 'investor'] as const;

export type UserStatus = (typeof USER_STATUS)[number];
export type MembershipFeeStatus = (typeof MEMBERSHIP_FEE_STATUS)[number];
export type GroupMemberStatus = (typeof GROUP_MEMBER_STATUS)[number];
export type ProjectStatus = (typeof PROJECT_STATUS)[number];
export type ProjectStage = (typeof PROJECT_STAGE)[number];
export type ProjectAudience = (typeof PROJECT_AUDIENCE)[number];
export type ProjectNeed = (typeof PROJECT_NEEDS)[number];
export type AccountType = (typeof ACCOUNT_TYPE)[number];
