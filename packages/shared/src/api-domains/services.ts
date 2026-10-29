import { z } from 'zod';
import { TAX_CODE_RE } from '../api';
import { ACCOUNT_TYPE } from '../enums';

/** SRS §13 Services — /service-requests, /admin/service-requests/* */

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});
export type Service = z.infer<typeof serviceSchema>;

export const serviceRequestSchema = z.object({
  code: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  requesterType: z.enum(['personal', 'business']),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  organization: z.string(),
  taxCode: z.string(),
  address: z.string(),
  note: z.string(),
  createdAt: z.string(),
  /** Thông tin thêm theo đối tượng (nghề nghiệp, loại hình, quy mô, ngân sách…) — nhãn → giá trị */
  details: z.record(z.string(), z.string()).optional(),
});
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

/**
 * Nhãn chuẩn của `details` (QT-11): khoá ngắn → nhãn tiếng Việt đang lưu trong `service_requests.details`.
 * Không đổi chuỗi — phiếu cũ hiển thị theo nhãn này.
 */
export const SERVICE_DETAIL_LABELS = {
  job: 'Nghề nghiệp / vai trò',
  field: 'Lĩnh vực hoạt động',
  bizSt: 'Tình trạng kinh doanh',
  orgType: 'Loại hình',
  size: 'Quy mô nhân sự',
  pos: 'Chức vụ người liên hệ',
  web: 'Website',
  when: 'Thời gian triển khai',
  budget: 'Ngân sách dự kiến',
} as const;
export type ServiceDetailKey = keyof typeof SERVICE_DETAIL_LABELS;

const DETAIL_LABEL_SET: ReadonlySet<string> = new Set(Object.values(SERVICE_DETAIL_LABELS));

/** Bỏ khoá ngoài nhãn chuẩn và giá trị rỗng (không tin nhãn tự do của client) */
export function normalizeServiceDetails(
  details: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(details ?? {})) {
    if (DETAIL_LABEL_SET.has(k) && v.trim()) out[k] = v.trim();
  }
  return out;
}

/** Thông điệp lỗi phiếu tư vấn — khớp `apps/portal/messages/vi/services.json › error.*` */
export const SERVICE_REQUEST_ERRORS = {
  name: 'Vui lòng nhập họ tên người liên hệ',
  phone: 'Số điện thoại không hợp lệ',
  email: 'Email không hợp lệ',
  org: 'Vui lòng nhập tên doanh nghiệp / tổ chức',
  orgType: 'Vui lòng chọn loại hình tổ chức',
  tax: 'Vui lòng nhập mã số thuế (10 hoặc 13 số)',
  size: 'Vui lòng chọn quy mô nhân sự',
  pos: 'Vui lòng nhập chức vụ người liên hệ',
  job: 'Vui lòng chọn nghề nghiệp / vai trò',
  addr: 'Vui lòng chọn tỉnh / thành phố',
  note: 'Vui lòng mô tả nhu cầu',
} as const;

export const SERVICE_PHONE_RE = /^[+0-9 ().-]{9,}$/;

/** "Có chữ" của ô mô tả HTML: bỏ thẻ, `&nbsp;` */
export const serviceNoteText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

const E = SERVICE_REQUEST_ERRORS;

/**
 * QT-11: trường bắt buộc theo đối tượng. Thứ tự lỗi như form Portal:
 * tên → SĐT → email (trường gốc) → tên DN → loại hình → MST → quy mô → chức vụ → nghề nghiệp → tỉnh → nhu cầu.
 */
export const createServiceRequestSchema = z
  .object({
    /** FX-02 (§29): rỗng / dịch vụ đã tắt → dịch vụ bật đầu tiên theo thứ tự hiển thị (id lạ → 404) */
    serviceId: z.string().trim().max(64).default(''),
    requesterType: z.enum(['personal', 'business']),
    fullName: z.string().trim().min(2, E.name).max(100),
    phone: z.string().trim().max(20).regex(SERVICE_PHONE_RE, E.phone),
    email: z.email(E.email),
    organization: z.string().trim().max(200).default(''),
    taxCode: z.string().trim().max(20).default(''),
    address: z.string().trim().max(200).default(''),
    note: z.string().trim().max(2000).default(''),
    details: z.record(z.string().max(60), z.string().trim().max(200)).optional(),
  })
  .superRefine((v, ctx) => {
    const d = v.details ?? {};
    const has = (k: ServiceDetailKey) => !!d[SERVICE_DETAIL_LABELS[k]]?.trim();
    const miss = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (v.requesterType === 'business') {
      if (!v.organization) miss(['organization'], E.org);
      if (!has('orgType')) miss(['details', 'orgType'], E.orgType);
      if (!TAX_CODE_RE.test(v.taxCode)) miss(['taxCode'], E.tax);
      if (!has('size')) miss(['details', 'size'], E.size);
      if (!has('pos')) miss(['details', 'pos'], E.pos);
    } else if (!has('job')) miss(['details', 'job'], E.job);
    if (!v.address) miss(['address'], E.addr);
    if (!serviceNoteText(v.note)) miss(['note'], E.note);
  });
export type CreateServiceRequest = z.input<typeof createServiceRequestSchema>;

export const serviceCommentSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export const createServiceCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

/**
 * Thông tin liên hệ điền sẵn cho form tư vấn — parse lỏng `GET /me` (hồ sơ đầy đủ, SRS §13):
 * chỉ lấy trường form cần.
 */
export const requesterProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  accountType: z.enum(ACCOUNT_TYPE),
  phone: z.object({ country: z.string(), number: z.string() }),
  business: z.object({ taxCode: z.string(), companyName: z.string() }).nullable(),
});
export type RequesterProfile = z.infer<typeof requesterProfileSchema>;
