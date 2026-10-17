import { DEFAULT_ROLE_PERMISSIONS } from '@opchub/shared';
import { categories, communities, languages, welcomeTemplate } from '@opchub/shared/fixtures';
import { SSO_IDS, welcomeMailSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';

/**
 * Dữ liệu seed bắt buộc (mọi môi trường) — data-model › Seed.
 * Nguồn: prototype (`@opchub/shared/fixtures`), parse zod trước khi ghi.
 */

const REGION_BY_TAG = {
  'Miền Bắc': 'north',
  'Miền Trung': 'central',
  'Miền Nam': 'south',
} as const;

const groupSeedSchema = z.object({
  id: z.string().regex(/^c\d+$/),
  name: z.string().min(1),
  province: z.string().min(1),
  tag: z.enum(['Miền Bắc', 'Miền Trung', 'Miền Nam']),
  desc: z.string(),
});

export const GROUPS = z
  .array(groupSeedSchema)
  .length(34)
  .parse(communities)
  .map((c) => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    province: c.province,
    region: REGION_BY_TAG[c.tag],
    description: c.desc,
  }));

/** Phòng `general` luôn có (GENERAL_ROOM); phòng khác do chủ nhóm/Admin tạo */
export const GENERAL_ROOM = { slug: 'general', name: 'Chung' } as const;

const categorySeedSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  scope: z.array(z.enum(['project', 'biz'])),
  on: z.boolean(),
});

export const CATEGORIES = z
  .array(categorySeedSchema)
  .parse(categories)
  .map((c, i) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    scopes: c.scope,
    sort: i,
    hidden: !c.on,
  }));

export const ROLE_PERMISSIONS = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, keys]) => ({
  role: role as keyof typeof DEFAULT_ROLE_PERMISSIONS,
  keys: [...keys],
}));

const w = welcomeTemplate as typeof welcomeTemplate & {
  loginUrl: string;
  guideUrl: string;
  atts: { title: string; url: string }[];
  rules: string[];
  showRules: boolean;
  showGuide: boolean;
};

/** Giá trị `app_settings` mặc định; `userCount` của SSO do server tính, không lưu */
export const APP_SETTINGS = {
  general: {
    platformName: 'OPC Hub Community',
    domain: 'community.opchub.vn',
    contactEmail: 'hello@opchub.vn',
    timezone: 'ict',
    logoUrl: null,
    openRegistration: true,
    otpVerification: true,
    requireProfile: true,
  },
  security: {
    providers: SSO_IDS.map((id) => ({ id, enabled: true })),
    minPasswordLength: 8,
    sessionDays: 30,
    requireAdmin2fa: true,
    lockoutEnabled: true,
  },
  languages: {
    defaultLocale: 'vi',
    items: languages.map((l) => ({ code: l.code, enabled: true })),
  },
  // D-47: không có khối mật khẩu tạm
  welcome_mail: welcomeMailSchema.parse({
    subject: w.subject,
    intro: w.intro,
    loginUrl: w.loginUrl,
    guideUrl: w.guideUrl,
    attachments: w.atts,
    rules: w.rules,
    showRules: w.showRules,
    showGuide: w.showGuide,
  }),
} as const;

export const SMTP_DEFAULT = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  encryption: 'tls',
  username: '',
  fromName: 'OPC Hub',
  fromEmail: 'no-reply@opchub.community',
  replyTo: 'support@opchub.community',
  dailyLimit: 300,
  enabled: true,
} as const;

/** D-29: Super Admin ban đầu; mật khẩu lấy từ env SEED_SUPER_ADMIN_PASSWORD */
export const SUPER_ADMIN = {
  id: 'admin',
  email: 'admin@opchub.community',
  fullName: 'Quản trị hệ thống',
} as const;
