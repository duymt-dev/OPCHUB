import type { RegisterBusinessRequest, RegisterPersonalRequest } from '../../../api';
import type { AdminMember } from '../../../api-domains';
import { phoneCountries, registrationRoles } from '../../../fixtures';
import { mockBizLookup } from '../../auth';
import { freshOnboarding } from '../onboarding-snapshot';
import { normalizeRegistrationEmail } from './state';

function phoneLabel(phone: { country: string; number: string }) {
  const digits = phone.number.replace(/\D/g, '');
  if (!digits) return '';
  const dial = phoneCountries.find((country) => country.id === phone.country)?.dial ?? '';
  const local = digits.replace(/^0/, '');
  return phone.country === 'vn' && local.length === 9
    ? `${dial} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
    : `${dial} ${local}`.trim();
}
const normalizedName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** D-40 trên MSW: MST tra được (không đuôi 999) và tên DN khớp → verified */
export function mockBusinessVerified(taxCode: string, companyName: string, country = 'vn') {
  return (
    country === 'vn' &&
    !taxCode.endsWith('999') &&
    normalizedName(companyName) === normalizedName(mockBizLookup(taxCode).companyName)
  );
}

/** Explicit allowlist: never retain the input password or an OTP credential. */
export function personalRegistrationProfile(
  input: RegisterPersonalRequest,
  now: number,
): AdminMember {
  const email = normalizeRegistrationEmail(input.email);
  return {
    id: `n-${email}`,
    accountType: 'personal',
    fullName: input.fullName.trim(),
    email,
    avatarUrl: null,
    phone: phoneLabel(input.phone),
    country: input.phone.country,
    organization: '',
    persona:
      registrationRoles.find((role) => role.id === input.persona)?.label ?? input.persona ?? '',
    status: 'active',
    createdAt: new Date(now).toISOString(),
    groupIds: [],
    // TK mới đăng ký: chưa đóng phí → 0/8 (V4-611)
    onboarding: freshOnboarding('personal'),
    business: null,
  };
}

export function businessRegistrationProfile(
  input: RegisterBusinessRequest,
  now: number,
): AdminMember {
  const email = normalizeRegistrationEmail(input.email);
  const taxCode = input.taxCode?.trim();
  const companyName = input.companyName?.trim() ?? '';
  const country = input.country || input.phone.country;
  const verified = !!taxCode && mockBusinessVerified(taxCode, companyName, country);
  return {
    id: `n-${email}`,
    accountType: 'business',
    fullName: input.representative.trim(),
    email,
    avatarUrl: null,
    phone: phoneLabel(input.phone),
    country: input.phone.country,
    organization: companyName,
    persona: 'Doanh nghiệp',
    status: 'active',
    createdAt: new Date(now).toISOString(),
    groupIds: [],
    // TK mới đăng ký: chưa đóng phí → 0/8 (V4-611)
    onboarding: freshOnboarding('business'),
    // D-89 (v4): chưa có MST lúc đăng ký → hồ sơ DN tạo ở popup khai báo
    business: taxCode
      ? {
          taxCode,
          companyName,
          field: input.mainIndustry ?? '',
          size: input.size ?? '',
          country,
          position: input.position,
          verification: verified ? 'verified' : 'pending',
        }
      : null,
  };
}
