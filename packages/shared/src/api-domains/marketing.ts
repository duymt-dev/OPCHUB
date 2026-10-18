import { z } from 'zod';

/**
 * Admin Marketing (D-33, D-78, D-79). SRS §13 chỉ có `GET/PUT /admin/mail/welcome`; các
 * endpoint còn lại đặt theo quy ước REST (Q-G6b-1):
 * - GET  /admin/marketing/summary
 * - GET  /admin/campaigns · POST /admin/campaigns (201) · DELETE /admin/campaigns/:id
 * - POST /admin/campaigns/:id/send (202, job qua outbox — không gửi thật)
 * - GET  /admin/campaigns/templates · GET /admin/campaigns/estimate?audience&groupIds
 * - GET  /admin/mail/log?page&size · POST /admin/mail/log/:id/resend (202)
 * - POST /admin/mail/welcome/test (202)
 */

export const CAMPAIGN_STATUS = ['draft', 'scheduled', 'sending', 'sent'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

/** Đối tượng nhận của form (prototype: Tất cả / Theo nhóm / Doanh nghiệp / Cá nhân) */
export const CAMPAIGN_AUDIENCE = ['all', 'groups', 'business', 'personal'] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCE)[number];

/**
 * Biến chèn vào nội dung chiến dịch (NA-27, prototype): lưu nguyên, thay khi gửi —
 * `{{ten}}` họ tên, `{{email}}`, `{{nhom}}` nhóm đầu tiên, `{{link_dang_nhap}}` link đăng nhập Portal.
 */
export const MAIL_VARIABLES = ['{{ten}}', '{{email}}', '{{nhom}}', '{{link_dang_nhap}}'] as const;
export type MailVariable = (typeof MAIL_VARIABLES)[number];

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  /** HTML đã qua sanitize ở BE; hiển thị lại phải qua SafeHtml */
  body: z.string(),
  audience: z.enum(CAMPAIGN_AUDIENCE),
  groupIds: z.array(z.string()),
  /** Nhãn đối tượng dựng ở BE ("Nhóm: OPC Hà Nội, OPC Bắc Ninh") */
  audienceLabel: z.string(),
  /** Số người nhận; null khi còn nháp */
  recipients: z.number().int().nullable(),
  /** Tỷ lệ mở / click (%) — chỉ có khi đã gửi */
  openRate: z.number().int().nullable(),
  clickRate: z.number().int().nullable(),
  status: z.enum(CAMPAIGN_STATUS),
  /** Giờ gửi (đã gửi / đang gửi) hoặc giờ hẹn (đã lên lịch), ISO UTC; nháp = null */
  sendAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignListSchema = z.object({ items: z.array(campaignSchema) });

/**
 * Nút cuối form: Lưu nháp / Lên lịch / Gửi ngay. `send` tạo chiến dịch + job gửi trong cùng
 * transaction (outbox, luật 8) — không gửi thật trong request.
 */
export const CAMPAIGN_SAVE_MODE = ['draft', 'schedule', 'send'] as const;
export type CampaignSaveMode = (typeof CAMPAIGN_SAVE_MODE)[number];

export const campaignCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    subject: z.string().trim().min(1).max(200),
    body: z.string().max(100_000).default(''),
    audience: z.enum(CAMPAIGN_AUDIENCE),
    groupIds: z.array(z.string().min(1)).max(100).default([]),
    mode: z.enum(CAMPAIGN_SAVE_MODE),
    scheduledAt: z.iso.datetime().nullable().default(null),
  })
  .refine((c) => c.mode !== 'schedule' || c.scheduledAt !== null, {
    path: ['scheduledAt'],
    message: 'Vui lòng chọn thời gian gửi',
  })
  .refine((c) => c.mode === 'draft' || c.audience !== 'groups' || c.groupIds.length > 0, {
    path: ['groupIds'],
    message: 'Vui lòng chọn ít nhất 1 nhóm',
  });
export type CampaignCreate = z.input<typeof campaignCreateSchema>;

export const campaignEstimateQuerySchema = z.object({
  audience: z.enum(CAMPAIGN_AUDIENCE).catch('all'),
  groupIds: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').filter(Boolean) : [])),
});
export const campaignEstimateSchema = z.object({ recipients: z.number().int() });

/** Job gửi mail đã vào hàng đợi (outbox → worker → adapter mail) */
export const mailJobSchema = z.object({
  jobId: z.string(),
  status: z.literal('queued'),
  recipients: z.number().int(),
});
export type MailJob = z.infer<typeof mailJobSchema>;

export const mailTemplateSchema = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
});
export type MailTemplate = z.infer<typeof mailTemplateSchema>;
export const mailTemplateListSchema = z.object({ items: z.array(mailTemplateSchema) });

export const MAIL_LOG_KIND = ['welcome', 'campaign'] as const;
export const mailLogRowSchema = z.object({
  id: z.string(),
  kind: z.enum(MAIL_LOG_KIND),
  to: z.string(),
  name: z.string(),
  subject: z.string(),
  sentAt: z.iso.datetime(),
  status: z.literal('sent'),
});
export type MailLogRow = z.infer<typeof mailLogRowSchema>;

export const marketingSummarySchema = z.object({
  campaigns: z.number().int(),
  /** Email đã gửi 30 ngày: người nhận các chiến dịch đã gửi + nhật ký */
  sent30d: z.number().int(),
  /** Tỷ lệ mở trung bình (%) các chiến dịch đã gửi; null khi chưa có */
  avgOpenRate: z.number().int().nullable(),
  welcomeSent: z.number().int(),
});
export type MarketingSummary = z.infer<typeof marketingSummarySchema>;

export const welcomeTestSchema = z.object({ to: z.email() });
