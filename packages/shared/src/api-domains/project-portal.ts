import { z } from 'zod';
import { PROJECT_STAGE } from '../enums';
import { fundraisingSchema } from './fundraising';
import { createInterestSchema, INVESTOR_KINDS } from './investors';
import { projectCommentSchema, projectItemSchema } from './projects';

/**
 * SRS §13 Projects — phần Portal (G3b). Mở rộng DTO `projectItemSchema` cho màn Khám phá,
 * Chi tiết, Dự án của tôi, form đăng dự án. Endpoint bổ sung ghi ở questions.md (Q-G3b-1).
 */

export const PROJECT_SORTS = ['new', 'follow', 'name'] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];
/** Giai đoạn lọc: 4 giai đoạn + "Đang gọi vốn" */
export const PROJECT_STAGE_FILTERS = [...PROJECT_STAGE, 'fund'] as const;
export type ProjectStageFilter = (typeof PROJECT_STAGE_FILTERS)[number];

export const projectListQuerySchema = z.object({
  cat: z.string().trim().optional(),
  stage: z.enum(PROJECT_STAGE_FILTERS).optional(),
  sort: z.enum(PROJECT_SORTS).catch('new'),
});

export const PROJECT_VISIBILITY = ['public', 'private'] as const;
export const REPO_PROVIDERS = ['github', 'gitlab'] as const;
export type RepoProvider = (typeof REPO_PROVIDERS)[number];

export const projectRepoSchema = z.object({
  provider: z.enum(REPO_PROVIDERS),
  /** NA-21: repo private → `null` với người không phải chủ dự án (Admin vẫn thấy) */
  url: z.string().nullable(),
  visibility: z.enum(PROJECT_VISIBILITY),
});

/** Bản sửa dự án đang hiển thị (REQ-106, D-18) — `approved` không còn hiện ở thẻ */
export const PROJECT_REVISION_STATUS = [
  'draft',
  'pending_review',
  'needs_changes',
  'rejected',
  'approved',
] as const;
export type ProjectRevisionStatus = (typeof PROJECT_REVISION_STATUS)[number];

export const projectRevisionRefSchema = z.object({
  status: z.enum(PROJECT_REVISION_STATUS),
  reviewNote: z.string().nullable(),
});
export type ProjectRevisionRef = z.infer<typeof projectRevisionRefSchema>;

export const projectCardSchema = projectItemSchema.extend({
  coverUrl: z.string().nullable(),
  /** Ảnh đại diện chủ dự án (hồ sơ thành viên) */
  ownerAvatarUrl: z.string().nullable(),
  commentCount: z.number().int(),
  followedByMe: z.boolean(),
  visibility: z.enum(PROJECT_VISIBILITY),
  /** Lần cập nhật nội dung gần nhất (Dự án của tôi) */
  updatedAt: z.string(),
  /**
   * Bản sửa gần nhất chưa được áp (chỉ trả cho chủ dự án ở "Dự án của tôi"/form sửa; API công
   * khai luôn `null` — không đọc bản sửa)
   */
  revision: projectRevisionRefSchema.nullable().default(null),
  /**
   * V4-610 (UP-11): Gói Gọi vốn đang hiệu lực (Admin đã duyệt, chưa hết hạn) → tab Gọi vốn + nút
   * Quan tâm. Không active thì `funding` chỉ trả cho chủ dự án (khai báo, chưa hiển thị).
   */
  fundraisingActive: z.boolean().default(false),
  /** Khoản Gọi vốn gần nhất — chỉ chủ dự án ("Dự án của tôi", chi tiết); người khác `null` */
  fundraising: fundraisingSchema.nullable().default(null),
});
export type ProjectCard = z.infer<typeof projectCardSchema>;

export const projectRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tone: projectItemSchema.shape.tone,
});
export type ProjectRef = z.infer<typeof projectRefSchema>;

export const projectDetailSchema = projectCardSchema.extend({
  /** HTML đã soạn (RichEditor) hoặc văn bản thuần của seed */
  description: z.string(),
  highlights: z.array(z.object({ title: z.string(), body: z.string() })),
  gallery: z.array(z.string()),
  updates: z.array(
    z.object({
      date: z.string(),
      title: z.string(),
      body: z.string(),
      tone: z.enum(['blue', 'green', 'amber', 'gray']),
    }),
  ),
  testUrl: z.string().nullable(),
  repo: projectRepoSchema.nullable(),
  repoAccessRequested: z.boolean(),
  isOwner: z.boolean(),
  /**
   * Kênh liên hệ chủ dự án TỰ công khai (BUG-016, QT-09, NĐ 13/2023) — không phải email/SĐT tài khoản;
   * null = không công khai kênh đó.
   */
  contact: z.object({ email: z.string().nullable(), phone: z.string().nullable() }),
  /** Đã cam kết = seed + tổng các quan tâm đầu tư (prototype) */
  pledged: z.number().int(),
  interestCount: z.number().int(),
  deckUrl: z.string().nullable(),
  myInterest: z.object({ amount: z.number().int(), currency: z.enum(['VND', 'USD']) }).nullable(),
  groupIds: z.array(z.string()),
  related: z.array(projectRefSchema),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const projectStatsSchema = z.object({
  total: z.number().int(),
  growing: z.number().int(),
  countries: z.number().int(),
  following: z.number().int(),
  categories: z.array(z.object({ name: z.string(), color: z.string(), count: z.number().int() })),
  featured: projectCardSchema.extend({ description: z.string() }).nullable(),
});
export type ProjectStats = z.infer<typeof projectStatsSchema>;

export const followResultSchema = z.object({
  followers: z.number().int(),
  followedByMe: z.boolean(),
});
export const followProjectSchema = z.object({ following: z.boolean() });

export const projectCommentViewSchema = projectCommentSchema.extend({ likedByMe: z.boolean() });
export type ProjectCommentView = z.infer<typeof projectCommentViewSchema>;
export const likeCommentSchema = z.object({ liked: z.boolean() });
export const likeResultSchema = z.object({ likes: z.number().int(), likedByMe: z.boolean() });
export const commentReplySchema = z.object({ body: z.string().trim().min(1).max(1000) });
export const commentResolvedSchema = z.object({ resolved: z.boolean() });

export const shareProjectSchema = z.object({
  groupIds: z.array(z.string()).min(1).max(34),
  message: z.string().trim().max(500).default(''),
});
export const shareResultSchema = z.object({ groupCount: z.number().int() });

export const memberSuggestionSchema = z.object({
  name: z.string(),
  subtitle: z.string(),
  avatarUrl: z.string().nullable(),
});
export type MemberSuggestion = z.infer<typeof memberSuggestionSchema>;

/** BR-09: tên + SĐT bắt buộc; đơn vị bắt buộc với DN/Quỹ; số tiền ≥ tối thiểu (kiểm ở server) */
export const createInterestPortalSchema = createInterestSchema
  .extend({
    contactName: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ().-]{9,}$/),
    amount: z.number().int().min(1),
    message: z.string().trim().max(1000).default(''),
  })
  .refine((v) => v.kind === 'individual' || v.organization.trim() !== '', {
    message: 'Vui lòng nhập tên đơn vị',
    path: ['organization'],
  });
export type CreateInterestPortal = z.input<typeof createInterestPortalSchema>;
export { INVESTOR_KINDS };

const HTTP_URL = /^https?:\/\/\S+\.\S+/;
/** SĐT liên hệ công khai (Zalo/Gọi) — cùng mẫu với form quan tâm đầu tư */
export const PROJECT_CONTACT_PHONE = /^[+0-9 ().-]{9,}$/;
export const PROJECT_CONTACT_MESSAGES = {
  badEmail: 'Email liên hệ không hợp lệ',
  badPhone: 'Số điện thoại liên hệ không hợp lệ',
} as const;
/** Rỗng → null (không công khai) */
const emptyToNull = (v: string) => (v === '' ? null : v);
const contactEmailSchema = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === '' || z.email().safeParse(v).success, PROJECT_CONTACT_MESSAGES.badEmail)
  .transform(emptyToNull);
const contactPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === '' || PROJECT_CONTACT_PHONE.test(v), PROJECT_CONTACT_MESSAGES.badPhone)
  .transform(emptyToNull);
const repoUrlOk = (provider: RepoProvider, url: string) =>
  new RegExp(`^https?://(www\\.)?${provider}\\.com/[^/]+/[^/]+`).test(url);

export const projectTeamInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(80).default(''),
  avatarUrl: z.string().max(2000).nullable().default(null),
  isOwner: z.boolean().default(false),
});

export const projectFundingInputSchema = z.object({
  amount: z.number().int().min(0),
  currency: z.enum(['VND', 'USD']),
  equityPercent: z.number().min(0).max(100),
  minTicket: z.number().int().min(0).default(0),
  deckUrl: z.string().trim().max(300).default(''),
  useOfFunds: z.string().trim().max(1000).default(''),
});

/**
 * Lưu nháp: chỉ kiểm kiểu. Gửi đăng (`submit`): kiểm như prototype — tên, lĩnh vực, mô tả ngắn,
 * gọi vốn (số tiền > 0, cổ phần 0,1–100%), link test, định dạng repo.
 */
export const projectSaveSchema = z
  .object({
    name: z.string().trim().max(120).default(''),
    category: z.string().trim().max(60).default(''),
    stage: z.enum(PROJECT_STAGE).default('idea'),
    summary: z.string().trim().max(160).default(''),
    description: z.string().max(20000).default(''),
    website: z.string().trim().max(300).default(''),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    coverUrl: z.string().max(2000).nullable().default(null),
    testUrl: z.string().trim().max(300).default(''),
    repo: z
      .object({
        provider: z.enum(REPO_PROVIDERS),
        url: z.string().trim().max(300),
        visibility: z.enum(PROJECT_VISIBILITY),
      })
      .nullable()
      .default(null),
    funding: projectFundingInputSchema.nullable().default(null),
    team: z.array(projectTeamInputSchema).max(20).default([]),
    visibility: z.enum(PROJECT_VISIBILITY).default('public'),
    groupIds: z.array(z.string()).max(34).default([]),
    /** Liên hệ công khai (BUG-016): rỗng / null → không công khai */
    contactEmail: contactEmailSchema.nullable().default(null),
    contactPhone: contactPhoneSchema.nullable().default(null),
    submit: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!v.submit) return;
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (!v.name) fail('name', 'Vui lòng nhập tên dự án');
    if (!v.category) fail('category', 'Vui lòng chọn lĩnh vực');
    if (!v.summary) fail('summary', 'Vui lòng nhập mô tả ngắn');
    if (v.funding && !(v.funding.amount > 0)) fail('funding', 'Vui lòng nhập số vốn cần gọi');
    if (v.funding && !(v.funding.equityPercent > 0))
      fail('funding', 'Cổ phần chào bán phải từ 0,1% đến 100%');
    if (!HTTP_URL.test(v.testUrl)) fail('testUrl', 'Vui lòng nhập link bản test hợp lệ');
    if (v.repo?.url && !repoUrlOk(v.repo.provider, v.repo.url))
      fail('repo', 'Link repository không đúng định dạng');
  });
export const projectReplyViewSchema = projectCommentSchema.shape.replies.element;
export const repoAccessResultSchema = z.object({ requested: z.literal(true) });
export const resolvedResultSchema = z.object({ resolved: z.boolean() });
export type ProjectSave = z.input<typeof projectSaveSchema>;
export type ProjectSaveData = z.output<typeof projectSaveSchema>;

export { HTTP_URL as PROJECT_HTTP_URL, repoUrlOk as projectRepoUrlOk };
