import type { Profile } from '@opchub/shared/api-domains';

export const PROFILE_TABS = ['info', 'business', 'activity', 'pay', 'security'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

/** Bản nháp form (prototype `meEdit`): chỉ chứa trường người dùng đã sửa */
export interface ProfileDraft {
  fullName?: string;
  phoneCountry?: string;
  phoneNumber?: string;
  persona?: string;
  country?: string;
  city?: string;
  bio?: string;
  taxCode?: string;
  companyName?: string;
  field?: string;
  size?: string;
  position?: string;
  website?: string;
}
export type DraftKey = keyof ProfileDraft;

/** Giá trị hiển thị = hồ sơ server + bản nháp; email chỉ đọc (BUG-030: đổi qua hộp OTP) */
export type ProfileValues = Required<ProfileDraft> & { email: string };

export interface ActivityGroup {
  id: string;
  name: string;
  mono: string;
  order: number;
  members: number;
  region: string;
}

export interface ActivityEvent {
  id: string;
  dow: string;
  dnum: string;
  title: string;
  time: string;
  place: string;
}

export type { Profile };
