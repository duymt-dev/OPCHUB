import type { RegisterBusinessRequest, RegisterPersonalRequest } from '@opchub/shared/api';
import { phoneCountries } from '@opchub/shared/fixtures';
import { z } from 'zod';

/** Bản ghi đăng ký chờ OTP trong Redis (`reg:{email}`) — chưa có user trong DB */
export const pendingRegistrationSchema = z.object({
  accountType: z.enum(['personal', 'business']),
  email: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  country: z.string(),
  passwordHash: z.string().nullable(),
  registrationRole: z.string().nullable(),
  position: z.string().nullable(),
  groupIds: z.array(z.string()),
  business: z
    .object({
      taxCode: z.string(),
      companyName: z.string(),
      representative: z.string(),
      position: z.string(),
      mainField: z.string(),
      subFields: z.array(z.string()),
      size: z.string(),
      country: z.string(),
    })
    .nullable(),
});
export type PendingRegistration = z.infer<typeof pendingRegistrationSchema>;

/** `{country:'vn', number:'0912 345 678'}` → `+84912345678`; số trống → null */
export function phoneToE164(p: { country: string; number: string }): string | null {
  const digits = p.number.replace(/\D/g, '');
  if (!digits) return null;
  const dial = (phoneCountries.find((c) => c.id === p.country)?.dial ?? '+84').slice(1);
  if (p.number.trim().startsWith('+')) return `+${digits}`;
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return `+${dial}${local}`;
}

export const isValidE164 = (p: string) => /^\+\d{8,15}$/.test(p);

export function fromPersonal(
  r: RegisterPersonalRequest,
  passwordHash: string | null,
): PendingRegistration {
  return {
    accountType: 'personal',
    email: r.email.trim().toLowerCase(),
    fullName: r.fullName.trim(),
    phone: phoneToE164(r.phone),
    country: r.phone.country,
    passwordHash,
    registrationRole: r.persona,
    position: null,
    groupIds: [...new Set(r.groupIds)],
    business: null,
  };
}

export function fromBusiness(
  r: RegisterBusinessRequest,
  passwordHash: string | null,
): PendingRegistration {
  return {
    accountType: 'business',
    email: r.email.trim().toLowerCase(),
    // Người đại diện là chủ tài khoản; chưa có thì dùng tên DN
    fullName: r.representative.trim() || r.companyName.trim(),
    phone: phoneToE164(r.phone),
    country: r.country || r.phone.country,
    passwordHash,
    registrationRole: null,
    position: r.position.trim() || null,
    groupIds: [...new Set(r.groupIds)],
    business: {
      taxCode: r.taxCode.trim(),
      companyName: r.companyName.trim(),
      representative: r.representative.trim(),
      position: r.position.trim(),
      mainField: r.mainIndustry.trim(),
      subFields: r.otherIndustries,
      size: r.size,
      country: r.country,
    },
  };
}

/** So tên không dấu, không phân biệt hoa, gộp khoảng trắng (D-40) */
export const normalizeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** D-40: MST tra được và tên DN khớp → verified; còn lại pending (vẫn dùng ngay) */
export function businessVerification(
  companyName: string,
  lookedUpName: string | null,
): 'verified' | 'pending' {
  return lookedUpName !== null && normalizeName(lookedUpName) === normalizeName(companyName)
    ? 'verified'
    : 'pending';
}
