import { z } from 'zod';

/**
 * TIP-V42-710 (D-97, D-114): trình tạo gian hàng 5 bước — media, liên hệ nhiều, mạng xã hội, điều kiện
 * theo bước (prototype `need`, index.html :5306) dùng chung server + Portal + MSW.
 */

/** FULL-AUDIT S5 A: số lượng tối đa mỗi loại media / liên hệ phụ */
export const STORE_LIMITS = {
  logos: 10,
  covers: 12,
  gallery: 12,
  videos: 6,
  team: 20,
  certs: 10,
  docs: 10,
  phones: 5,
  emails: 5,
  addresses: 5,
} as const;

/** 6 ảnh bìa mẫu của prototype (`COVERS`, :5209) — chọn được không cần tải lên, × để ẩn */
export const STORE_STOCK_COVERS = [
  'photo-1497366216548-37526070297c',
  'photo-1556761175-5973dc0f32e7',
  'photo-1441986300917-64674bd600d8',
  'photo-1495474472287-4d71bcdd2085',
  'photo-1513694203232-719a280e022f',
  'photo-1460925895917-afdab827c52f',
].map((id) => `https://images.unsplash.com/${id}?w=900&h=520&fit=crop&auto=format`);
export const isStockCover = (url: string) => STORE_STOCK_COVERS.includes(url);

/** Thứ tự prototype `_socList`: Zalo · Facebook · Website (cột `website`) · YouTube · TikTok · LinkedIn */
export const STORE_SOCIAL_KEYS = ['zalo', 'fb', 'web', 'yt', 'tt', 'li'] as const;
export type StoreSocialKey = (typeof STORE_SOCIAL_KEYS)[number];
export const STORE_SOCIAL_STORED = ['zalo', 'fb', 'yt', 'tt', 'li'] as const;

/** '' hoặc URL / tên miền không khoảng trắng */
export const storeLinkSchema = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .max(200)
    .regex(/^\S+\.\S+$/),
]);
export const storePhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 .()-]{8,20}$/);

export const storeSocialsSchema = z.object({
  zalo: storeLinkSchema,
  fb: storeLinkSchema,
  yt: storeLinkSchema,
  tt: storeLinkSchema,
  li: storeLinkSchema,
});
export type StoreSocials = z.infer<typeof storeSocialsSchema>;
export const EMPTY_SOCIALS: StoreSocials = { zalo: '', fb: '', yt: '', tt: '', li: '' };

const mediaUrl = z.string().trim().min(1).max(500);

export const storeVideoSchema = z.object({ url: mediaUrl, title: z.string().trim().max(120) });
export type StoreVideo = z.infer<typeof storeVideoSchema>;

export const storeTeamSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(80),
  desc: z.string().trim().max(200),
  photoUrl: mediaUrl.nullable(),
});
export type StoreTeamMember = z.infer<typeof storeTeamSchema>;

export const storeCertSchema = z.object({
  name: z.string().trim().min(1).max(120),
  org: z.string().trim().max(120),
  imageUrl: mediaUrl,
});
export type StoreCert = z.infer<typeof storeCertSchema>;

/** `ext` / `size` server tính lại từ object đã tải (client gửi để hiển thị trước khi lưu) */
export const storeDocSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ext: z.string().max(8),
  size: z.string().max(20),
  url: mediaUrl,
});
export type StoreDoc = z.infer<typeof storeDocSchema>;

/** Phần media + liên hệ mở rộng — dùng cho cả chi tiết (đọc) và PUT /me/store (ghi) */
export const storeBuilderFields = {
  ward: z.string().trim().max(80),
  logoUrl: mediaUrl.nullable(),
  logos: z.array(mediaUrl).max(STORE_LIMITS.logos),
  covers: z.array(mediaUrl).max(STORE_LIMITS.covers),
  hiddenCovers: z.array(z.string().max(500)).max(STORE_STOCK_COVERS.length),
  vision: z.string().trim().max(1000),
  mission: z.string().trim().max(1000),
  gallery: z.array(mediaUrl).max(STORE_LIMITS.gallery),
  videos: z.array(storeVideoSchema).max(STORE_LIMITS.videos),
  team: z.array(storeTeamSchema).max(STORE_LIMITS.team),
  certs: z.array(storeCertSchema).max(STORE_LIMITS.certs),
  docs: z.array(storeDocSchema).max(STORE_LIMITS.docs),
  phones: z.array(z.union([z.literal(''), storePhoneSchema])).max(STORE_LIMITS.phones),
  emails: z.array(z.union([z.literal(''), z.email()])).max(STORE_LIMITS.emails),
  addresses: z.array(z.string().trim().max(200)).max(STORE_LIMITS.addresses),
  socials: storeSocialsSchema,
};

export const storeBuilderSchema = z.object(storeBuilderFields);
export type StoreBuilder = z.infer<typeof storeBuilderSchema>;

/** Media + liên hệ mở rộng trống — gian hàng mới / bản ghi cũ trước V4.2 */
export const EMPTY_STORE_BUILDER: StoreBuilder = {
  ward: '',
  logoUrl: null,
  logos: [],
  covers: [],
  hiddenCovers: [],
  vision: '',
  mission: '',
  gallery: [],
  videos: [],
  team: [],
  certs: [],
  docs: [],
  phones: [],
  emails: [],
  addresses: [],
  socials: EMPTY_SOCIALS,
};

/* ── Điều kiện theo bước (prototype `need`) ── */

export const STORE_STEPS = [1, 2, 3, 4, 5] as const;
export type StoreStep = (typeof STORE_STEPS)[number];

export const STORE_NEED_KEYS = [
  'name',
  'field',
  'province',
  'intro',
  'cover',
  'items',
  'phone',
  'address',
] as const;
export type StoreNeedKey = (typeof STORE_NEED_KEYS)[number];

/** Câu lỗi đúng prototype — server + MSW; Portal dịch theo khoá `stores.wizard.need.<key>` */
export const STORE_NEED_MESSAGES: Record<StoreNeedKey, string> = {
  name: 'Vui lòng nhập tên doanh nghiệp',
  field: 'Vui lòng chọn ngành nghề',
  province: 'Vui lòng nhập tỉnh / thành',
  intro: 'Giới thiệu cần tối thiểu 40 ký tự',
  cover: 'Vui lòng chọn hoặc thêm ảnh bìa',
  items: 'Thêm ít nhất 1 sản phẩm hoặc dịch vụ',
  phone: 'Vui lòng nhập hotline',
  address: 'Vui lòng nhập địa chỉ',
};

export interface StoreNeedInput {
  name: string;
  field: string;
  province: string;
  intro: string;
  coverUrl: string | null;
  items: readonly unknown[];
  phone: string;
  address: string;
}

/** Prototype `need[2]`: giới thiệu tối thiểu 40 ký tự */
export const STORE_INTRO_MIN = 40;

/** Điều kiện chưa đạt của từng bước theo đúng thứ tự prototype; bước 3 không bắt buộc */
export function storeStepNeeds(s: StoreNeedInput): Record<StoreStep, StoreNeedKey[]> {
  const miss = (pairs: [boolean, StoreNeedKey][]) => pairs.filter(([ok]) => !ok).map(([, k]) => k);
  return {
    1: miss([
      [!!s.name.trim(), 'name'],
      [!!s.field, 'field'],
      [!!s.province.trim(), 'province'],
    ]),
    2: miss([
      [s.intro.trim().length >= STORE_INTRO_MIN, 'intro'],
      [!!s.coverUrl, 'cover'],
    ]),
    3: [],
    4: miss([[s.items.length > 0, 'items']]),
    5: miss([
      [!!s.phone.trim(), 'phone'],
      [!!s.address.trim(), 'address'],
    ]),
  };
}

/** Bước đầu tiên chưa đủ + câu lỗi đầu tiên của bước đó; null = đủ để xuất bản */
export function firstStoreNeed(s: StoreNeedInput): { step: StoreStep; key: StoreNeedKey } | null {
  const needs = storeStepNeeds(s);
  for (const step of STORE_STEPS) {
    const key = needs[step][0];
    if (key) return { step, key };
  }
  return null;
}

/* ── Dashboard "Gian hàng của tôi" (D-114 S6: chỉ số thật) ── */

export const storeDashboardSchema = z.object({
  /** 7 ngày gần nhất theo giờ Việt Nam, cũ → mới, `day` = YYYY-MM-DD */
  days: z.array(z.object({ day: z.string(), views: z.number().int() })).length(7),
  views7: z.number().int(),
  viewsPrev7: z.number().int(),
  guestViews7d: z.number().int().nonnegative().default(0),
  /** Nhu cầu đang mở của gian hàng */
  openNeeds: z.number().int(),
});
export type StoreDashboard = z.infer<typeof storeDashboardSchema>;
