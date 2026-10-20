import { TAX_CODE_RE } from '@opchub/shared/api';

/** Kiểm form đăng ký (A-17, A-20) — hàm thuần, test ở register-validation.spec.ts */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Khoá i18n `auth.register.*` của lỗi */
export type RegisterErrorKey =
  | 'errTaxEmpty'
  | 'errTax'
  | 'errCompany'
  | 'errIndustry'
  | 'errPersona'
  | 'errGroups'
  | 'errEmail'
  | 'errAgree';

/** Ô có thể báo lỗi (cả lỗi server: phone, email, tax) */
export type RegisterField =
  'tax' | 'company' | 'industry' | 'persona' | 'phone' | 'email' | 'groups' | 'agree';
export type RegisterErrors = Partial<Record<RegisterField, RegisterErrorKey>>;

/** path lỗi server (POST /auth/register/*) → ô form (§6: báo lỗi tại trường) */
export const REGISTER_FIELD_MAP = {
  taxCode: 'tax',
  'business.taxCode': 'tax',
  companyName: 'company',
  mainIndustry: 'industry',
  persona: 'persona',
  phone: 'phone',
  email: 'email',
  groupIds: 'groups',
  agreeTerms: 'agree',
} as const satisfies Record<string, RegisterField>;

const emailOk = (email: string) => EMAIL_RE.test(email.trim());

/** Đăng ký cá nhân: kiểm MỌI ô (BUG-022), thứ tự prototype — vai trò → nhóm → email */
export function validatePersonal(v: {
  persona: string;
  groupIds: readonly string[];
  email: string;
  agree: boolean;
}): RegisterErrors {
  const e: RegisterErrors = {};
  if (!v.persona) e.persona = 'errPersona';
  if (!v.groupIds.length) e.groups = 'errGroups';
  if (!emailOk(v.email)) e.email = 'errEmail';
  if (!v.agree) e.agree = 'errAgree';
  return e;
}

/**
 * Đăng ký DN: kiểm MỌI ô (BUG-022), thứ tự prototype — MST → tên DN → ngành → nhóm → email.
 * Thứ tự khoá theo thứ tự kiểm, nên ô focus/toast đầu tiên giống prototype.
 */
export function validateBusiness(v: {
  tax: string;
  companyName: string;
  mainIndustry: string;
  groupIds: readonly string[];
  email: string;
  agree: boolean;
}): RegisterErrors {
  const e: RegisterErrors = {};
  const tax = v.tax.trim();
  if (!tax) e.tax = 'errTaxEmpty';
  else if (!TAX_CODE_RE.test(tax)) e.tax = 'errTax';
  if (!v.companyName.trim()) e.company = 'errCompany';
  if (!v.mainIndustry.trim()) e.industry = 'errIndustry';
  if (!v.groupIds.length) e.groups = 'errGroups';
  if (!emailOk(v.email)) e.email = 'errEmail';
  if (!v.agree) e.agree = 'errAgree';
  return e;
}
