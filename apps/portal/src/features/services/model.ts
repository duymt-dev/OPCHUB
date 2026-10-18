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

/**
 * Khoá message lỗi đầu tiên hoặc null khi hợp lệ. Cùng bộ luật QT-11 với server
 * (`createServiceRequestSchema`): DN thêm MST (10/13 số), quy mô, chức vụ.
 */
export function firstError(f: ConsultForm): ConsultError | null {
  const biz = f.kind === 'biz';
  if (!f.name.trim()) return 'name';
  if (!SERVICE_PHONE_RE.test(f.phone.trim())) return 'phone';
  if (!EMAIL_RE.test(f.email.trim())) return 'email';
  if (biz) {
    if (!f.org.trim()) return 'org';
    if (!f.orgType) return 'orgType';
    if (!TAX_CODE_RE.test(f.tax.trim())) return 'tax';
    if (!f.size) return 'size';
    if (!f.pos.trim()) return 'pos';
  } else if (!f.job) return 'job';
  if (!f.addr) return 'addr';
  if (!plainText(f.note)) return 'note';
  return null;
}

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
