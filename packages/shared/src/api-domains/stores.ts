import { z } from 'zod';
import { storeNeedSchema } from './needs';
import { firstStoreNeed, type StoreNeedInput, storeBuilderFields } from './store-builder';

/**
 * V4-608 Gian hàng địa phương (REQ-510, D-75, §25.1 / §25.2, §27.6 UP-08 / AD-07); V4.2 D-97 / D-114:
 * TK Doanh nghiệp trial / còn phí có gian hàng Nháp tự tạo (đăng ký, đóng phí, migration), chủ đi 5 bước
 * rồi xuất bản → hiện ngay.
 */

export const STORE_STATUS = ['draft', 'published', 'hidden'] as const;
export type StoreStatus = (typeof STORE_STATUS)[number];
/** §25.1: Sinh viên · Cá nhân · Tổ chức · Doanh nghiệp */
export const STORE_AUDIENCES = ['student', 'personal', 'organization', 'business'] as const;
export type StoreAudience = (typeof STORE_AUDIENCES)[number];
export const STORE_ITEM_KINDS = ['product', 'service'] as const;
export type StoreItemKind = (typeof STORE_ITEM_KINDS)[number];
export const STORE_SORTS = ['newest', 'view', 'name', 'items'] as const;
export type StoreSort = (typeof STORE_SORTS)[number];

export const STORE_ITEMS_MAX = 50;
/** Prototype hiện toàn bộ lưới (không phân trang); 24 = bội của lưới 3 / 4 cột (DV-V4-608-1) */
export const STORE_PAGE_SIZE = 24;
export const ADMIN_STORE_PAGE_SIZE = 10;

export const storeItemSchema = z.object({
  id: z.string(),
  kind: z.enum(STORE_ITEM_KINDS),
  name: z.string(),
  /** VND số nguyên; `null` = "Liên hệ báo giá" */
  price: z.number().int().nullable(),
  description: z.string(),
  imageUrl: z.string().nullable(),
});
export type StoreItem = z.infer<typeof storeItemSchema>;

/** Thẻ Khám phá */
export const storeCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  slogan: z.string(),
  field: z.string(),
  province: z.string(),
  audience: z.enum(STORE_AUDIENCES),
  /** D-89: loại hình (tag thứ 2 trên thẻ), '' = không có */
  legalForm: z.string(),
  coverUrl: z.string().nullable(),
  itemCount: z.number().int(),
  updatedAt: z.string(),
  /** V4-609: có nhu cầu đang mở → badge "Đang tìm đối tác" */
  seeking: z.boolean(),
  /** D-89 (P-105): lượt xem trang chi tiết */
  views: z.number().int(),
  /** D-89: Admin gắn "Nổi bật" — badge đỏ, ưu tiên hơn "Đang tìm đối tác" như prototype */
  featured: z.boolean(),
  /** D-89: người xem đã bấm tim yêu thích */
  fav: z.boolean(),
});
export type StoreCard = z.infer<typeof storeCardSchema>;

/** Chi tiết 1 trang + Gian hàng của tôi */
export const storeDetailSchema = storeCardSchema.extend({
  intro: z.string(),
  website: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  status: z.enum(STORE_STATUS),
  ownerName: z.string(),
  isMine: z.boolean(),
  items: z.array(storeItemSchema),
  /** V4-609 khối "Đang cần": nhu cầu đang mở của gian hàng (tối đa 6) */
  openNeeds: z.array(storeNeedSchema),
  /** D-97: logo, phường, tầm nhìn / sứ mệnh, ảnh, video, đội ngũ, chứng nhận, tài liệu, liên hệ nhiều, MXH */
  ...storeBuilderFields,
  /** Tạo tự động — Portal mở thẳng trình tạo khi còn trống (prototype `wzOn`) */
  autoCreated: z.boolean(),
});
export type StoreDetail = z.infer<typeof storeDetailSchema>;

const splitMulti = (v: unknown): unknown[] =>
  v === undefined || v === ''
    ? []
    : Array.isArray(v)
      ? (v as unknown[])
      : typeof v === 'string'
        ? v.split(',')
        : [v];
const multi = z.preprocess(splitMulti, z.array(z.string().trim().min(1)).max(40));

export const storeListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  kind: z.enum(STORE_ITEM_KINDS).optional().catch(undefined),
  audience: multi.pipe(z.array(z.enum(STORE_AUDIENCES))).catch([]),
  field: multi.catch([]),
  province: multi.catch([]),
  sort: z.enum(STORE_SORTS).catch('newest'),
  page: z.coerce.number().int().min(1).catch(1),
});
export type StoreListQuery = z.infer<typeof storeListQuerySchema>;

const facet = z.array(z.object({ value: z.string(), count: z.number().int() }));
/** Số đếm từng nhóm lọc (§25.2: "(n)" cạnh mỗi lựa chọn) — tính trên toàn bộ gian hàng hiển thị */
export const storeFacetsSchema = z.object({
  total: z.number().int(),
  kind: z.object({ product: z.number().int(), service: z.number().int() }),
  audience: facet,
  field: facet,
  province: facet,
});
export type StoreFacets = z.infer<typeof storeFacetsSchema>;

export const storeListSchema = z.object({
  items: z.array(storeCardSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
  facets: storeFacetsSchema,
});
export type StoreList = z.infer<typeof storeListSchema>;

const optionalUrl = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .max(200)
    .regex(/^\S+\.\S+$/),
]);

export const storeItemInputSchema = z.object({
  kind: z.enum(STORE_ITEM_KINDS),
  name: z.string().trim().min(1, 'Nhập tên sản phẩm / dịch vụ').max(120),
  price: z.number().int().min(0).nullable(),
  description: z.string().trim().max(500),
  imageUrl: z.string().max(500).nullable(),
});
export type StoreItemInput = z.infer<typeof storeItemInputSchema>;

/** PUT /me/store — `field` thuộc danh mục scope `project`, `province` thuộc 34 tỉnh (server kiểm) */
export const storeUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slogan: z.string().trim().max(160),
  audience: z.enum(STORE_AUDIENCES),
  field: z.string().trim().max(80),
  province: z.string().trim().max(80),
  intro: z.string().trim().max(4000),
  coverUrl: z.string().max(500).nullable(),
  phone: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 .()-]{8,20}$/),
  ]),
  email: z.union([z.literal(''), z.email()]),
  website: optionalUrl,
  address: z.string().trim().max(200),
  items: z.array(storeItemInputSchema).max(STORE_ITEMS_MAX),
  ...storeBuilderFields,
});
export type StoreUpsert = z.infer<typeof storeUpsertSchema>;

/** Thông báo lỗi dùng chung server + MSW */
export const STORE_MESSAGES = {
  hiddenByAdmin: 'Gian hàng đang bị Admin ẩn, vui lòng liên hệ quản trị viên',
  businessOnly: 'Chỉ tài khoản Doanh nghiệp có gian hàng',
  /** D-114: gian hàng Nháp tạo ngay khi mở dùng thử / đóng phí — chỉ thiếu trong vài giây đầu */
  noStoreYet: 'Gian hàng đang được khởi tạo, vui lòng tải lại sau ít phút',
} as const;

/** D-97: đủ điều kiện 5 bước (prototype `need`) mới xuất bản / lưu khi đang hiển thị */
export const canPublishStore = (s: StoreNeedInput): boolean => firstStoreNeed(s) === null;

/* ── Admin › Gian hàng (AD-07) ── */

/** Thứ tự chip prototype (`aFilters`): Tất cả · Đang hiển thị · Bản nháp · Đã ẩn */
export const ADMIN_STORE_FILTERS = ['all', 'published', 'draft', 'hidden'] as const;
export type AdminStoreFilter = (typeof ADMIN_STORE_FILTERS)[number];

export const adminStoreQuerySchema = z.object({
  status: z.enum(ADMIN_STORE_FILTERS).catch('all'),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).catch(1),
});

export const adminStoreSchema = storeDetailSchema.omit({
  isMine: true,
  seeking: true,
  openNeeds: true,
  fav: true,
});
export type AdminStore = z.infer<typeof adminStoreSchema>;

export const adminStoreSummarySchema = z.object({
  total: z.number().int(),
  published: z.number().int(),
  draft: z.number().int(),
  hidden: z.number().int(),
});
export type AdminStoreSummary = z.infer<typeof adminStoreSummarySchema>;

export const adminStoreListSchema = z.object({
  items: z.array(adminStoreSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
  summary: adminStoreSummarySchema,
});
export type AdminStoreList = z.infer<typeof adminStoreListSchema>;

export const adminStoreModerateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  reason: z.string().trim().max(300).optional(),
});
export const adminStoreModerateResultSchema = z.object({ changed: z.number().int() });

/** PUT /stores/:id/favorite — bật / tắt tim yêu thích (D-89, P-105) */
export const storeFavoriteSchema = z.object({ on: z.boolean() });
export const storeFavoriteResultSchema = z.object({ fav: z.boolean() });
export type StoreFavoriteResult = z.infer<typeof storeFavoriteResultSchema>;
/** PUT /admin/stores/:id/featured — Admin gắn / gỡ "Nổi bật" */
export const adminStoreFeaturedSchema = z.object({ featured: z.boolean() });
