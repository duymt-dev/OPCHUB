import { TAX_CODE_RE } from '@opchub/shared/api';
import {
  type CreateServiceRequest,
  type RequesterProfile,
  SERVICE_DETAIL_LABELS,
  SERVICE_PHONE_RE,
  serviceNoteText,
} from '@opchub/shared/api-domains';
import { phoneCountries } from '@opchub/shared/fixtures';
import type { ConsultForm } from './types';

/** Logic thuần của form tư vấn (test ở model.spec.ts) */

/** Lựa chọn của prototype (value = nhãn) */
export const OPTIONS = {
  job: [
    'Freelancer',
    'Chuyên gia / Tư vấn',
    'Giảng viên / Trainer',
    'Sinh viên',
    'Chủ hộ kinh doanh',
    'Nhân viên văn phòng',
    'Khác',
  ],
  bizSt: ['Chưa đăng ký kinh doanh', 'Hộ kinh doanh', 'Đã có doanh nghiệp'],
  orgType: [
    'Doanh nghiệp',
    'Hộ kinh doanh',
    'Trường ĐH / CĐ',
    'Cơ quan nhà nước',
    'Hiệp hội / Tổ chức khác',
  ],
  size: ['1 – 10 người', '11 – 50 người', '51 – 200 người', 'Trên 200 người'],
  when: ['Trong 1 tháng', '1 – 3 tháng', '3 – 6 tháng', 'Chưa xác định'],
  budget: ['Dưới 10 triệu', '10 – 50 triệu', '50 – 200 triệu', 'Trên 200 triệu', 'Cần tư vấn thêm'],
} as const;

const dialOf = (country: string) => phoneCountries.find((c) => c.id === country)?.dial ?? '';

/** Điền sẵn từ hồ sơ: TK doanh nghiệp mở sẵn biến thể Doanh nghiệp (như prototype) */
export function initialForm(svc: string, me: RequesterProfile | undefined): ConsultForm {
  const biz = me?.accountType === 'business';
  const dial = me ? dialOf(me.phone.country) : '';
  return {
    svc,
    kind: biz ? 'biz' : 'per',
    name: me?.fullName ?? '',
    phone: me ? `${dial} ${me.phone.number}`.trim() : '',
    email: me?.email ?? '',
    job: '',
    field: '',
    bizSt: '',
    org: biz ? (me?.business?.companyName ?? '') : '',
    orgType: '',
    tax: biz ? (me?.business?.taxCode ?? '') : '',
    size: '',
    web: '',
    pos: '',
    addr: '',
    when: '',
    budget: '',
    note: '',
  };
}

export const plainText = serviceNoteText;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ConsultError =
  'name' | 'phone' | 'email' | 'org' | 'orgType' | 'tax' | 'size' | 'pos' | 'job' | 'addr' | 'note';

/** Mỗi lỗi nằm ở ô cùng tên (khoá i18n `services.error.<ô>`) */
export type ConsultErrors = Partial<Record<ConsultError, ConsultError>>;

/**
 * Kiểm MỌI ô (BUG-022), thứ tự khoá = thứ tự kiểm cũ (V2Q-74) nên ô focus/toast đầu không đổi.
 * Cùng bộ luật QT-11 với server (`createServiceRequestSchema`): DN thêm MST, quy mô, chức vụ.
 * Rỗng = hợp lệ.
 */
export function consultErrors(f: ConsultForm): ConsultErrors {
  const biz = f.kind === 'biz';
  const bad: [ConsultError, boolean][] = [
    ['name', !f.name.trim()],
    ['phone', !SERVICE_PHONE_RE.test(f.phone.trim())],
    ['email', !EMAIL_RE.test(f.email.trim())],
    ['org', biz && !f.org.trim()],
    ['orgType', biz && !f.orgType],
    ['tax', biz && !TAX_CODE_RE.test(f.tax.trim())],
    ['size', biz && !f.size],
    ['pos', biz && !f.pos.trim()],
    ['job', !biz && !f.job],
    ['addr', !f.addr],
    ['note', !plainText(f.note)],
  ];
  const e: ConsultErrors = {};
  for (const [k, isBad] of bad) if (isBad) e[k] = k;
  return e;
}

/** Lỗi đầu tiên (thứ tự kiểm) hoặc null khi hợp lệ */
export const firstError = (f: ConsultForm): ConsultError | null =>
  (Object.keys(consultErrors(f)) as ConsultError[])[0] ?? null;

/** path lỗi server (POST /service-requests, V2Q-74) → ô form */
export const CONSULT_FIELD_MAP = {
  fullName: 'name',
  phone: 'phone',
  email: 'email',
  organization: 'org',
  'details.orgType': 'orgType',
  taxCode: 'tax',
  'details.size': 'size',
  'details.pos': 'pos',
  'details.job': 'job',
  address: 'addr',
  note: 'note',
} as const satisfies Record<string, ConsultError>;

/** Trường của form → nhãn chuẩn (admin xem ở chi tiết phiếu) + biến thể áp dụng */
const DETAIL_SCOPE: [keyof typeof SERVICE_DETAIL_LABELS, 'per' | 'biz' | 'all'][] = [
  ['job', 'per'],
  ['field', 'per'],
  ['bizSt', 'per'],
  ['orgType', 'biz'],
  ['size', 'biz'],
  ['pos', 'biz'],
  ['web', 'biz'],
  ['when', 'all'],
  ['budget', 'all'],
];

export function toRequest(f: ConsultForm): CreateServiceRequest {
  const biz = f.kind === 'biz';
  const details: Record<string, string> = {};
  for (const [k, scope] of DETAIL_SCOPE) {
    const v = f[k].trim();
    if (v && (scope === 'all' || scope === f.kind)) details[SERVICE_DETAIL_LABELS[k]] = v;
  }
  return {
    serviceId: f.svc,
    requesterType: biz ? 'business' : 'personal',
    fullName: f.name.trim(),
    phone: f.phone.trim(),
    email: f.email.trim(),
    organization: biz ? f.org.trim() : '',
    taxCode: biz ? f.tax.trim() : '',
    address: f.addr,
    note: f.note,
    details,
  };
}
