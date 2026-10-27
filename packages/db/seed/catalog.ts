import { ADMIN_SYSTEM_ROLES, DEFAULT_ADMIN_ROLE_PERMISSIONS } from '@opchub/shared';
import {
  categories,
  communities,
  industryGroups,
  languages,
  services,
  welcomeTemplate,
} from '@opchub/shared/fixtures';
import {
  botSettingsSchema,
  CATEGORY_SCOPES,
  SSO_IDS,
  welcomeMailSchema,
} from '@opchub/shared/api-domains';
import { buildBotTopics } from '@opchub/shared/mock-domains';
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

/** D-89 (prototype v4): 56 nhóm ngành `g1…g56`, con của nhóm tỉnh */
export const INDUSTRY_GROUPS = z
  .array(
    groupSeedSchema.extend({
      id: z.string().regex(/^g\d+$/),
      industry: z.string().min(1),
      parent: z.string(),
    }),
  )
  .length(56)
  .parse(industryGroups)
  .map((c) => ({
    id: c.id,
    slug: c.id,
    name: c.name,
    province: c.province,
    region: REGION_BY_TAG[c.tag],
    kind: 'industry' as const,
    industry: c.industry,
    parentId: c.parent,
    description: c.desc,
  }));

/** Phòng `general` luôn có (GENERAL_ROOM); phòng khác do chủ nhóm/Admin tạo */
export const GENERAL_ROOM = {
  slug: 'general',
  name: 'Chung',
  description: 'Phòng mặc định của nhóm',
} as const;

const categorySeedSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  scope: z.array(z.enum(CATEGORY_SCOPES)),
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

/**
 * RB-R04: 5 vai trò hệ thống (`key` cố định) + quyền mặc định §21.2 (TIP-V2-201).
 * Super Admin không có dòng quyền (luôn đủ 25 khoá).
 */
export const ADMIN_ROLES = ADMIN_SYSTEM_ROLES.map((r) => ({
  key: r.key,
  name: r.name,
  description: r.description,
  permissions: r.key === 'super_admin' ? [] : [...DEFAULT_ADMIN_ROLE_PERMISSIONS[r.key]],
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
    requireAdmin2fa: false,
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
  // B45: cấu hình bot (D-04 luôn duyệt) — chủ đề gợi ý theo prototype
  bot: botSettingsSchema.parse({
    enabled: true,
    delayMinutes: 5,
    topics: buildBotTopics(),
    autoGenerate: true,
    replyToMembers: true,
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

/** D-60 (TIP-V2-302, V4-605): 15 dịch vụ danh mục v4 — seed bắt buộc mọi môi trường */
export const SERVICES = services.map((s, i) => ({
  id: s.id,
  name: s.n,
  model: s.m,
  description: s.d,
  enabled: !!s.on,
  sort: i,
}));

/** D-29: Super Admin ban đầu; mật khẩu lấy từ env SEED_SUPER_ADMIN_PASSWORD */
export const SUPER_ADMIN = {
  id: 'admin',
  email: 'admin@opchub.community',
  fullName: 'Quản trị hệ thống',
} as const;

/** Từ khóa kiểm duyệt mặc định (prototype `state.keywords`, S-08) — Admin thêm/bớt sau */
export const MODERATION_KEYWORDS = [
  'chuyển khoản trước',
  'bán tài khoản',
  'số CCCD',
  'mật khẩu',
  'đồ ngu',
  'kiếm tiền nhanh',
  'vay nóng',
] as const;
