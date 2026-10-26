import { z } from 'zod';

/**
 * V4-611 Hướng dẫn bắt đầu 8 bước (REQ-505, D-76, D-85, D-88, §27.6 UP-04 / AD-02).
 * Thứ tự + key theo prototype v4 `_dash`; bước 5 / 6 khác nhau giữa DN và Cá nhân.
 */
export const ONBOARDING_TOTAL = 8;
export const ONBOARDING_KEYS_BIZ = ['pay', 'prof', 'grp', 'chat', 'st', 'nd', 'aff', 'ev'] as const;
export const ONBOARDING_KEYS_PER = ['pay', 'prof', 'grp', 'chat', 'pj', 'ex', 'aff', 'ev'] as const;
export const ONBOARDING_KEYS = [
  'pay',
  'prof',
  'grp',
  'chat',
  'st',
  'pj',
  'nd',
  'ex',
  'aff',
  'ev',
] as const;
export type OnboardingKey = (typeof ONBOARDING_KEYS)[number];

/** Bước không có dữ liệu nguồn → cờ theo từng người (D-85) */
export const ONBOARDING_FLAGS = ['explore', 'affiliate_share'] as const;
export type OnboardingFlag = (typeof ONBOARDING_FLAGS)[number];
export const onboardingFlagParamSchema = z.enum(ONBOARDING_FLAGS);

export const onboardingStepSchema = z.object({
  key: z.enum(ONBOARDING_KEYS),
  done: z.boolean(),
  /** Bước 2–8 khoá khi chưa đóng phí */
  locked: z.boolean(),
});
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingSchema = z.object({
  accountType: z.enum(['business', 'personal']),
  paid: z.boolean(),
  done: z.number().int().min(0).max(ONBOARDING_TOTAL),
  total: z.literal(ONBOARDING_TOTAL),
  steps: z.array(onboardingStepSchema).length(ONBOARDING_TOTAL),
  /** Cá nhân có dự án: thẻ tuỳ chọn "Gói Gọi vốn" ngoài 8 bước (D-85) */
  fundraising: z.object({ done: z.boolean() }).nullable(),
});
export type Onboarding = z.infer<typeof onboardingSchema>;

/** Cột "Khởi đầu" ở Admin › Thành viên */
export const adminOnboardingSchema = z.object({
  done: z.number().int().min(0).max(ONBOARDING_TOTAL),
  missing: z.array(z.enum(ONBOARDING_KEYS)),
  /** Đã nhắc trong 24 giờ qua (D-88) → hiện "Đã nhắc" */
  reminded: z.boolean(),
});
export type AdminOnboarding = z.infer<typeof adminOnboardingSchema>;

export const ADMIN_ONBOARDING_FILTERS = ['done', 'todo'] as const;
export type AdminOnboardingFilter = (typeof ADMIN_ONBOARDING_FILTERS)[number];

/** Mẫu email nhắc (D-88: mẫu tạm, Admin sửa ở Email tự động) */
export const onboardingMailSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
});
export type OnboardingMail = z.infer<typeof onboardingMailSchema>;

export const ONBOARDING_MAIL_DEFAULT: OnboardingMail = {
  subject: 'Hoàn tất hướng dẫn bắt đầu trên OPC Hub',
  body: 'Xin chào {{ten}},\n\nBạn còn vài bước để tham gia OPC Hub đầy đủ: {{con_thieu}}.\n\nMở Dashboard để hoàn tất: {{link}}\n\nBan quản trị OPC Hub',
};

/** Nhãn ngắn của bước (tooltip "Còn thiếu" ở Admin, thông báo + email nhắc) — prototype `_ob` */
export const ONBOARDING_SHORT: Record<OnboardingKey, string> = {
  pay: 'Thanh toán phí',
  prof: 'Hồ sơ',
  grp: 'Nhóm OPC',
  chat: 'Lời chào',
  st: 'Gian hàng',
  pj: 'Dự án OPC',
  nd: 'Nhu cầu',
  ex: 'Khám phá',
  aff: 'Affiliate',
  ev: 'Sự kiện',
};

export const ONBOARDING_MESSAGES = {
  remindTitle: 'Admin nhắc: hoàn tất hướng dẫn bắt đầu',
  remindTooSoon: 'Đã nhắc thành viên này trong 24 giờ qua',
  remindDone: 'Thành viên đã hoàn tất 8 bước khởi đầu',
} as const;
