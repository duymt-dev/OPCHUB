/** Enum trạng thái — coding-packs/standards/global/domain-glossary.md */
export const USER_STATUS = ['active', 'locked'] as const;
export const MEMBERSHIP_FEE_STATUS = ['pending_payment', 'active', 'expiring', 'expired'] as const;
export const GROUP_MEMBER_STATUS = [
  'pending',
  'member',
  'rejected',
  'cancelled',
  'left',
  'removed',
] as const;
export const GROUP_JOIN_MODE = ['open', 'approval'] as const;
export const PROJECT_STATUS = [
  'draft',
  'pending_review',
  'published',
  'hidden',
  'needs_changes',
  'rejected',
] as const;
export const PROJECT_STAGE = ['idea', 'mvp', 'growth', 'launched'] as const;
export const ACCOUNT_TYPE = ['personal', 'business', 'investor'] as const;
export const INVESTOR_INTEREST_STATUS = ['sent', 'in_discussion', 'connected'] as const;
export const SERVICE_REQUEST_STATUS = ['new', 'consulting', 'quoted', 'won', 'lost'] as const;

export type UserStatus = (typeof USER_STATUS)[number];
export type MembershipFeeStatus = (typeof MEMBERSHIP_FEE_STATUS)[number];
export type GroupMemberStatus = (typeof GROUP_MEMBER_STATUS)[number];
export type GroupJoinMode = (typeof GROUP_JOIN_MODE)[number];
export type ProjectStatus = (typeof PROJECT_STATUS)[number];
export type ProjectStage = (typeof PROJECT_STAGE)[number];
export type AccountType = (typeof ACCOUNT_TYPE)[number];
export type InvestorInterestStatus = (typeof INVESTOR_INTEREST_STATUS)[number];
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUS)[number];
