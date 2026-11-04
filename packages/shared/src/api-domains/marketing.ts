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
 * - POST /admin/campaigns/:id/cancel (BUG-036: dừng gửi, thư chưa gửi bị huỷ)
 * - GET/POST /public/unsubscribe (BUG-036, NĐ 13: huỷ nhận thư chiến dịch, không cần đăng nhập)
 */

export const CAMPAIGN_STATUS = ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] as const;
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

/** Nhật ký thư Admin (NA-05): mọi loại thư */
export const MAIL_LOG_KIND = [
  'welcome',
  'campaign',
  'otp',
  'password_reset',
  'fee_reminder',
  'event',
  'test',
  /** NA-22: xác nhận phiếu yêu cầu dịch vụ */
  'service',
  /** V4-610: nhắc gia hạn / hết hạn Gói Gọi vốn */
  'fundraising',
  /** V4-611 (D-88): Admin nhắc hoàn tất hướng dẫn bắt đầu */
  'onboarding',
  /** V42-704 (D-113 F4): biên nhận phí thành viên / Gói Gọi vốn */
  'receipt',
  'regional_director',
] as const;
export type MailLogKind = (typeof MAIL_LOG_KIND)[number];
export const MAIL_LOG_STATUS = ['queued', 'sent', 'failed', 'cancelled'] as const;
export type MailLogStatus = (typeof MAIL_LOG_STATUS)[number];

/** Mã đã hết hạn → không gửi lại thư lỗi của các loại này */
export const MAIL_NO_RESEND_KINDS: readonly MailLogKind[] = ['otp', 'password_reset'];

export const mailLogRowSchema = z.object({
  id: z.string(),
  kind: z.enum(MAIL_LOG_KIND),
  to: z.string(),
  name: z.string(),
  subject: z.string(),
  /** Giờ gửi; thư chưa gửi = giờ xếp hàng */
  sentAt: z.iso.datetime(),
  status: z.enum(MAIL_LOG_STATUS),
  /** Số lần gửi lỗi đã thử (1 lần đầu + tối đa 3 lần thử lại 1/5/15 phút) */
  attempts: z.number().int().default(0),
  /** Lỗi gần nhất (≤ 500 ký tự) */
  error: z.string().nullable().default(null),
});
export type MailLogRow = z.infer<typeof mailLogRowSchema>;

/** Gửi lại: thư đã gửi (chào mừng / chiến dịch) hoặc thư lỗi (trừ mã OTP / đặt lại MK) */
export const canResendMail = (r: Pick<MailLogRow, 'kind' | 'status'>): boolean =>
  r.status === 'sent'
    ? r.kind === 'welcome' || r.kind === 'campaign'
    : r.status === 'failed' && !MAIL_NO_RESEND_KINDS.includes(r.kind);

/**
 * Link huỷ nhận (BUG-036): `base64url(email).HMAC_SHA256_hex` — không hết hạn, không lưu DB.
 * Sai định dạng → 400 cùng thông điệp với chữ ký sai.
 */
export const UNSUBSCRIBE_INVALID = 'Liên kết huỷ đăng ký không hợp lệ';
export const unsubscribeSchema = z.object({
  token: z
    .string({ error: UNSUBSCRIBE_INVALID })
    .max(600, UNSUBSCRIBE_INVALID)
    .regex(/^[A-Za-z0-9_-]+\.[A-Fa-f0-9]{64}$/, UNSUBSCRIBE_INVALID),
});
export type UnsubscribeRequest = z.infer<typeof unsubscribeSchema>;
/** GET: email đã che để người dùng nhận ra địa chỉ của mình */
export const unsubscribeInfoSchema = z.object({ email: z.string() });
export const unsubscribeResultSchema = z.object({
  email: z.string(),
  unsubscribed: z.literal(true),
});

/** "an.nguyen@mediasoft.vn" → "an***@mediasoft.vn" (giữ ≤ 2 ký tự đầu, tối thiểu che 1 ký tự) */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const keep = Math.min(2, Math.max(1, local.length - 1));
  return `${local.slice(0, keep)}***${email.slice(at)}`;
}

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
