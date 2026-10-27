import { PROJECT_CONTACT_PHONE, type ProjectDetail } from '@opchub/shared/api-domains';
import type { ProjectFormState } from './types';

/** Hàm thuần cho liên hệ công khai của dự án (BUG-016, BUG-021, QT-09 bước 6) */

type ContactErrors = Partial<
  Record<'contactEmail' | 'contactPhone', 'badContactEmail' | 'badContactPhone'>
>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Liên hệ công khai (BUG-016) — kiểm cả khi lưu nháp (server kiểm mọi lần lưu). Rỗng = hợp lệ */
export function validateContact(f: ProjectFormState): ContactErrors {
  const e: ContactErrors = {};
  const email = f.contactEmail.trim();
  const phone = f.contactPhone.trim();
  if (email && !EMAIL_RE.test(email)) e.contactEmail = 'badContactEmail';
  if (phone && !PROJECT_CONTACT_PHONE.test(phone)) e.contactPhone = 'badContactPhone';
  return e;
}

/** SĐT 10 số liền → "0912 345 678" như prototype; số đã có định dạng giữ nguyên */
const fmtPhone = (p: string) => p.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');

/** Nút liên hệ chủ dự án (QT-09 bước 6): chỉ kênh có dữ liệu; Zalo/Gọi dùng số đã bỏ ký tự phụ */
export function contactLinks(c: Pick<ProjectDetail['contact'], 'email' | 'phone'>) {
  const digits = c.phone ? c.phone.replace(/[^+0-9]/g, '') : '';
  const shown = c.phone ? fmtPhone(c.phone) : '';
  return {
    email: c.email ? { href: `mailto:${c.email}`, label: c.email } : null,
    zalo: digits ? { href: `https://zalo.me/${digits.replace(/^\+/, '')}`, label: shown } : null,
    call: digits ? { href: `tel:${digits}`, label: shown } : null,
  };
}
