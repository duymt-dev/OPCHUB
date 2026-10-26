import type { AdminMember, AdminOnboarding } from '@opchub/shared/api-domains';
import { registrationRoles } from '@opchub/shared/fixtures';
import type { AdminMemberRow } from '../repositories/admin-users.repository';
import { splitPhone } from './profile.mapper';

/** "+84912345678" → "+84 912 345 678" như prototype; số lạ giữ nguyên */
export function formatPhone(e164: string | null, country: string): string {
  if (!e164) return '';
  const { country: cc, number } = splitPhone(e164, country);
  const dial = e164.slice(0, e164.length - number.length);
  if (cc !== 'vn' || number.length !== 9) return `${dial} ${number}`.trim();
  return `${dial} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
}

/** NĐT / dữ liệu thiếu: coi như chưa bắt đầu (8 bước còn thiếu theo loại TK được tính ở module onboarding) */
const NO_ONBOARDING: AdminOnboarding = { done: 0, missing: [], reminded: false };

export function toAdminMember(
  u: AdminMemberRow,
  groupIds: string[],
  onboarding: AdminOnboarding = NO_ONBOARDING,
): AdminMember {
  const b = u.businessProfile;
  return {
    id: u.id,
    accountType: u.accountType === 'business' ? 'business' : 'personal',
    fullName: u.fullName,
    email: u.email,
    phone: formatPhone(u.phone, u.country),
    country: splitPhone(u.phone, u.country).country,
    organization: b?.companyName ?? '',
    persona: b
      ? 'Doanh nghiệp'
      : (registrationRoles.find((r) => r.id === u.registrationRole)?.label ??
        u.registrationRole ??
        ''),
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    groupIds,
    onboarding,
    business: b
      ? {
          taxCode: b.taxCode,
          companyName: b.companyName,
          field: b.mainField,
          size: b.size ?? '',
          country: b.country ?? '',
          position: b.position,
          verification: b.verification === 'unverified' ? 'pending' : b.verification,
        }
      : null,
  };
}
