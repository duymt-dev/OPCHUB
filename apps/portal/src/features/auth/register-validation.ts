/** Kiểm form đăng ký v4 (D-89) — hàm thuần, test ở register-validation.spec.ts */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Khoá i18n `auth.register.*` của lỗi */
export type RegisterErrorKey = 'errRep' | 'errEmail' | 'errAgree';

/** Ô có thể báo lỗi (cả lỗi server: phone, email) */
export type RegisterField = 'rep' | 'phone' | 'email' | 'agree' | 'referralCode';
export type RegisterErrors = Partial<Record<RegisterField, RegisterErrorKey>>;

/** path lỗi server (POST /auth/register/*) → ô form (§6: báo lỗi tại trường) */
export const REGISTER_FIELD_MAP = {
  referralCode: 'referralCode',
  representative: 'rep',
  phone: 'phone',
  email: 'email',
  agreeTerms: 'agree',
} as const satisfies Record<string, RegisterField>;

const emailOk = (email: string) => EMAIL_RE.test(email.trim());

/**
 * Đăng ký cá nhân v4: vai trò + nhóm chuyển sang popup khai báo (V4-607) → chỉ còn email
 * nhận OTP và ô đồng ý (NR-R02). Kiểm MỌI ô cùng lúc (BUG-022).
 */
export function validatePersonal(v: { email: string; agree: boolean }): RegisterErrors {
  const e: RegisterErrors = {};
  if (!emailOk(v.email)) e.email = 'errEmail';
  if (!v.agree) e.agree = 'errAgree';
  return e;
}

/**
 * Đăng ký DN v4: thứ tự prototype — người đại diện → email. MST / tên DN / ngành / nhóm khai
 * báo ở popup sau đăng nhập. Thứ tự khoá theo thứ tự kiểm, nên ô focus đầu tiên giống prototype.
 */
export function validateBusiness(v: {
  representative: string;
  email: string;
  agree: boolean;
}): RegisterErrors {
  const e: RegisterErrors = {};
  if (!v.representative.trim()) e.rep = 'errRep';
  if (!emailOk(v.email)) e.email = 'errEmail';
  if (!v.agree) e.agree = 'errAgree';
  return e;
}
