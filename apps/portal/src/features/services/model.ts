import type { CreateServiceRequest, RequesterProfile } from '@opchub/shared/api-domains';
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

export const plainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

const PHONE_RE = /^[+0-9 ().-]{9,}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ConsultError = 'name' | 'phone' | 'email' | 'org' | 'orgType' | 'job' | 'addr' | 'note';

/** Khoá message lỗi đầu tiên (thứ tự kiểm như prototype) hoặc null khi hợp lệ */
export function firstError(f: ConsultForm): ConsultError | null {
  const biz = f.kind === 'biz';
  if (!f.name.trim()) return 'name';
  if (!PHONE_RE.test(f.phone.trim())) return 'phone';
  if (!EMAIL_RE.test(f.email.trim())) return 'email';
  if (biz && !f.org.trim()) return 'org';
  if (biz && !f.orgType) return 'orgType';
  if (!biz && !f.job) return 'job';
  if (!f.addr) return 'addr';
  if (!plainText(f.note)) return 'note';
  return null;
}

/** Nhãn hiển thị cho phần thông tin thêm (admin xem ở chi tiết phiếu) */
const DETAIL_LABELS: [keyof ConsultForm, string, 'per' | 'biz' | 'all'][] = [
  ['job', 'Nghề nghiệp / vai trò', 'per'],
  ['field', 'Lĩnh vực hoạt động', 'per'],
  ['bizSt', 'Tình trạng kinh doanh', 'per'],
  ['orgType', 'Loại hình', 'biz'],
  ['size', 'Quy mô nhân sự', 'biz'],
  ['pos', 'Chức vụ người liên hệ', 'biz'],
  ['web', 'Website', 'biz'],
  ['when', 'Thời gian triển khai', 'all'],
  ['budget', 'Ngân sách dự kiến', 'all'],
];

export function toRequest(f: ConsultForm): CreateServiceRequest {
  const biz = f.kind === 'biz';
  const details: Record<string, string> = {};
  for (const [k, label, scope] of DETAIL_LABELS) {
    const v = f[k].trim();
    if (v && (scope === 'all' || scope === f.kind)) details[label] = v;
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
