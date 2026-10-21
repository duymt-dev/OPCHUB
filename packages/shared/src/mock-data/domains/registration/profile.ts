import type { RegisterBusinessRequest, RegisterPersonalRequest } from '../../../api';
import type { AdminMember } from '../../../api-domains';
import { phoneCountries, registrationRoles } from '../../../fixtures';
import { mockBizLookup } from '../../auth';
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
    phone: phoneLabel(input.phone),
    country: input.phone.country,
    organization: '',
    persona: registrationRoles.find((role) => role.id === input.persona)?.label ?? input.persona,
    status: 'active',
    createdAt: new Date(now).toISOString(),
    groupIds: [],
    business: null,
  };
}

export function businessRegistrationProfile(
  input: RegisterBusinessRequest,
  now: number,
): AdminMember {
  const email = normalizeRegistrationEmail(input.email);
  const verified =
    input.country === 'vn' &&
    !input.taxCode.endsWith('999') &&
    normalizedName(input.companyName) === normalizedName(mockBizLookup(input.taxCode).companyName);
  return {
    id: `n-${email}`,
    accountType: 'business',
    fullName: input.representative.trim() || input.companyName.trim(),
    email,
    phone: phoneLabel(input.phone),
    country: input.phone.country,
    organization: input.companyName.trim(),
    persona: 'Doanh nghiệp',
    status: 'active',
    createdAt: new Date(now).toISOString(),
    groupIds: [],
    business: {
      taxCode: input.taxCode,
      companyName: input.companyName.trim(),
      field: input.mainIndustry,
      size: input.size,
      country: input.country,
      position: input.position,
      verification: verified ? 'verified' : 'pending',
    },
  };
}
