import { z } from 'zod';

/**
 * V4-609 Nhu cầu địa phương (REQ-511, D-75, §27.6 UP-09 / AD-07).
 * Chỉ chủ gian hàng (TK Doanh nghiệp đã đóng phí) đăng; hiển thị ngay, Admin chỉ ẩn khi vi phạm.
 */

/** Prototype NT (thứ tự chip / form) */
export const NEED_TYPES = [
  'buy',
  'sell',
  'partner',
  'service',
  'solution',
  'staff',
  'space',
  'capital',
  'other',
] as const;
export type NeedType = (typeof NEED_TYPES)[number];

/** Dashboard rule-based recommendations (BR-478–480); no private need payload. */
export const needMatchReasonSchema = z.enum(['field', 'province', 'product']);
export type NeedMatchReason = z.infer<typeof needMatchReasonSchema>;
export const needMatchRowSchema = z.object({
  id: z.string().min(1),
  type: z.enum(NEED_TYPES),
  title: z.string(),
  field: z.string(),
  province: z.string(),
  reasons: z.array(needMatchReasonSchema).max(3),
  pct: z.number().int().min(30).max(98),
});
export type NeedMatchRow = z.infer<typeof needMatchRowSchema>;
export const needMatchesSchema = z.object({
  hasStore: z.boolean(),
  storeField: z.string().nullable(),
  rows: z.array(needMatchRowSchema).max(3),
});
export type NeedMatches = z.infer<typeof needMatchesSchema>;
/** Prototype: 5 chip luôn hiện, còn lại chỉ khi có nhu cầu đang mở loại đó */
export const NEED_TYPES_ALWAYS: readonly NeedType[] = [
  'buy',
  'sell',
  'partner',
  'service',
  'solution',
];
export const NEED_STATUS = ['open', 'closed', 'hidden'] as const;
export type NeedStatus = (typeof NEED_STATUS)[number];
export const NEED_SCOPES = ['province', 'region', 'nation'] as const;
export const NEED_CHANNELS = ['zalo', 'call', 'email'] as const;
export const NEED_COOPERATION = [
  'Mua đứt',
  'Hợp đồng định kỳ',
  'Ký gửi / phân phối',
  'Liên kết sản xuất',
  'Thuê dịch vụ',
  'Hợp tác chia lợi nhuận',
  'Góp vốn',
] as const;
export const NEED_STANDARDS = [
  'VietGAP',
  'GlobalGAP',
  'Hữu cơ',
  'OCOP',
  'HACCP / ISO 22000',
  'ISO 9001',
  'Truy xuất nguồn gốc',
  'Hóa đơn VAT',
] as const;
/** Ô ngành "Khác" → nhập ngành tự do */
export const NEED_FIELD_OTHER = 'Khác';
export const NEED_DESC_MIN = 20;
export const NEED_PAGE_SIZE = 24;
export const ADMIN_NEED_PAGE_SIZE = 10;
export const NEED_STORE_MAX = 6;

export const NEED_MESSAGES = {
  title: 'Nhập tiêu đề nhu cầu',
  field: 'Chọn ngành cần tìm',
  fieldCustom: 'Nhập ngành bạn cần tìm',
  desc: 'Mô tả chi tiết tối thiểu 20 ký tự',
  contact: 'Nhập số điện thoại hoặc email liên hệ',
  budget: 'Ngân sách “từ” phải nhỏ hơn “đến”',
  noStore: 'Nhu cầu được đăng gắn với gian hàng của bạn',
  hidden: 'Liên hệ Admin để mở lại',
} as const;

/** Gợi ý gian hàng cùng ngành (ưu tiên cùng tỉnh) — prototype "Gợi ý: k gian hàng X cùng tỉnh →" */
export const needSuggestionSchema = z.object({
  count: z.number().int(),
  sameProvince: z.boolean(),
});
export type NeedSuggestion = z.infer<typeof needSuggestionSchema>;

export const needSchema = z.object({
  id: z.string(),
  type: z.enum(NEED_TYPES),
  title: z.string(),
  description: z.string(),
  field: z.string(),
  fieldCustom: z.boolean(),
  quantity: z.string(),
  /** Cả hai `null` = "Thỏa thuận" */
  budgetMin: z.number().int().nullable(),
  budgetMax: z.number().int().nullable(),
  province: z.string(),
  ward: z.string(),
  dueAt: z.string().nullable(),
  scope: z.enum(NEED_SCOPES),
  cooperation: z.array(z.string()),
  standards: z.array(z.string()),
  docUrl: z.string(),
  contactName: z.string(),
  phone: z.string(),
  email: z.string(),
  channel: z.enum(NEED_CHANNELS),
  status: z.enum(NEED_STATUS),
  store: z.object({ id: z.string(), name: z.string(), coverUrl: z.string().nullable() }),
  isMine: z.boolean(),
  suggestion: needSuggestionSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Need = z.infer<typeof needSchema>;

export const needListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(NEED_TYPES).optional().catch(undefined),
  province: z.string().trim().max(80).optional().catch(undefined),
  field: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type NeedListQuery = z.infer<typeof needListQuerySchema>;

const facet = z.array(z.object({ value: z.string(), count: z.number().int() }));
/** Đếm trên toàn bộ nhu cầu đang mở (không phụ thuộc lọc đang chọn), như prototype */
export const needFacetsSchema = z.object({
  total: z.number().int(),
  type: facet,
  province: facet,
  field: facet,
});
export type NeedFacets = z.infer<typeof needFacetsSchema>;

export const needListSchema = z.object({
  items: z.array(needSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
  facets: needFacetsSchema,
});
export type NeedList = z.infer<typeof needListSchema>;

export const myNeedsSchema = z.object({
  /** Gian hàng để đăng (null = chưa có, D-84) */
  store: z.object({ id: z.string(), name: z.string(), province: z.string() }).nullable(),
  items: z.array(needSchema),
});
export type MyNeeds = z.infer<typeof myNeedsSchema>;

const money = z.number().int().min(0).max(1_000_000_000_000).nullable();

/** POST /me/needs — copy lỗi theo prototype (thứ tự kiểm `postNeed`) */
export const needCreateSchema = z
  .object({
    type: z.enum(NEED_TYPES),
    title: z.string().trim().min(1, NEED_MESSAGES.title).max(160),
    field: z.string().trim().min(1, NEED_MESSAGES.field).max(80),
    fieldCustom: z.string().trim().max(80).default(''),
    description: z.string().trim().min(NEED_DESC_MIN, NEED_MESSAGES.desc).max(2000),
    quantity: z.string().trim().max(80).default(''),
    budgetMin: money.default(null),
    budgetMax: money.default(null),
    province: z.string().trim().min(1).max(80),
    ward: z.string().trim().max(80).default(''),
    /** yyyy-mm-dd (ngày giờ VN) */
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    scope: z.enum(NEED_SCOPES).default('province'),
    cooperation: z.array(z.enum(NEED_COOPERATION)).max(NEED_COOPERATION.length).default([]),
    standards: z.array(z.enum(NEED_STANDARDS)).max(NEED_STANDARDS.length).default([]),
    docUrl: z.union([z.literal(''), z.string().trim().url().max(300)]).default(''),
    contactName: z.string().trim().max(120).default(''),
    phone: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .regex(/^\+?[0-9 .()-]{8,20}$/),
      ])
      .default(''),
    email: z.union([z.literal(''), z.email()]).default(''),
    channel: z.enum(NEED_CHANNELS).default('zalo'),
  })
  .superRefine((v, ctx) => {
    if (v.field === NEED_FIELD_OTHER && !v.fieldCustom)
      ctx.addIssue({ code: 'custom', path: ['fieldCustom'], message: NEED_MESSAGES.fieldCustom });
    if (!v.phone && !v.email)
      ctx.addIssue({ code: 'custom', path: ['phone'], message: NEED_MESSAGES.contact });
    if (v.budgetMin !== null && v.budgetMax !== null && v.budgetMin >= v.budgetMax)
      ctx.addIssue({ code: 'custom', path: ['budgetMax'], message: NEED_MESSAGES.budget });
  });
export type NeedCreate = z.infer<typeof needCreateSchema>;
export type NeedCreateInput = z.input<typeof needCreateSchema>;

export const needActionSchema = z.object({ action: z.enum(['close', 'reopen']) });

/** Khối "Đang cần" ở chi tiết gian hàng */
export const storeNeedSchema = needSchema.pick({
  id: true,
  type: true,
  title: true,
  quantity: true,
  dueAt: true,
});
export type StoreNeed = z.infer<typeof storeNeedSchema>;

/* ── Admin › Nhu cầu (AD-07) ── */

export const ADMIN_NEED_FILTERS = ['all', 'open', 'closed', 'hidden'] as const;
export type AdminNeedFilter = (typeof ADMIN_NEED_FILTERS)[number];

export const adminNeedQuerySchema = z.object({
  status: z.enum(ADMIN_NEED_FILTERS).catch('all'),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).catch(1),
});

export const adminNeedSchema = needSchema.omit({ isMine: true, suggestion: true });
export type AdminNeed = z.infer<typeof adminNeedSchema>;

export const adminNeedListSchema = z.object({
  items: z.array(adminNeedSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
  summary: z.object({
    total: z.number().int(),
    open: z.number().int(),
    closed: z.number().int(),
    hidden: z.number().int(),
  }),
});
export type AdminNeedList = z.infer<typeof adminNeedListSchema>;

export const adminNeedModerateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  reason: z.string().trim().max(300).optional(),
});
