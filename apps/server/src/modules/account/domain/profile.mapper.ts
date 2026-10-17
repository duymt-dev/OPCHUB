import type { Profile, ProfileStats, UpdateProfileRequest } from '@opchub/shared/api-domains';
import { phoneCountries, registrationRoles } from '@opchub/shared/fixtures';
import type { FeeSnapshot } from '../ports';
import type { BusinessPatch, UserPatch } from '../repositories/profile.repository';
import { type SessionUser, toMe } from './me.mapper';
import { phoneToE164 } from './register.mapper';

export interface ProfileRow extends SessionUser {
  phone: string | null;
  registrationRole: string | null;
  position: string | null;
  country: string;
  city: string;
  bio: string;
  createdAt: Date;
  businessProfile: {
    taxCode: string;
    companyName: string;
    mainField: string;
    size: string | null;
    position: string;
    website: string;
    verification: 'unverified' | 'verified' | 'pending' | 'rejected';
  } | null;
  identities: { provider: string }[];
}

/** `+84912345678` → `{country:'vn', number:'912345678'}` theo mã quốc gia dài nhất khớp */
export function splitPhone(e164: string | null, fallback: string): Profile['phone'] {
  if (!e164) return { country: fallback, number: '' };
  const hit = [...phoneCountries]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => e164.startsWith(c.dial));
  return hit
    ? { country: hit.id, number: e164.slice(hit.dial.length) }
    : { country: fallback, number: e164 };
}

/** Vai trò đăng ký lưu id (`expert`) → nhãn hiển thị như prototype (`Chuyên gia`) */
const personaLabel = (id: string | null) =>
  registrationRoles.find((r) => r.id === id)?.label ?? id ?? '';
const personaId = (label: string) =>
  registrationRoles.find((r) => r.label === label || r.id === label)?.id ?? label;

export function toProfile(u: ProfileRow, fee: FeeSnapshot | null, stats: ProfileStats): Profile {
  const b = u.businessProfile;
  return {
    ...toMe(u, fee),
    phone: splitPhone(u.phone, u.country),
    persona: b ? 'Doanh nghiệp' : personaLabel(u.registrationRole),
    country: u.country,
    city: u.city,
    bio: u.bio,
    joinedAt: u.createdAt.toISOString(),
    business: b
      ? {
          taxCode: b.taxCode,
          companyName: b.companyName,
          field: b.mainField,
          size: b.size ?? '',
          position: b.position,
          website: b.website,
          verification: b.verification === 'verified' ? 'verified' : 'pending',
        }
      : null,
    stats,
    linkedSso: [...new Set(u.identities.map((i) => i.provider))],
  };
}

/** Tách PATCH thành phần users + business_profiles (chỉ trường có gửi) */
export function toPatch(req: UpdateProfileRequest): { user: UserPatch; biz: BusinessPatch | null } {
  const user: UserPatch = {};
  if (req.fullName !== undefined) user.fullName = req.fullName;
  if (req.email !== undefined) user.email = req.email.toLowerCase();
  if (req.phone !== undefined) user.phone = phoneToE164(req.phone);
  if (req.persona !== undefined) user.registrationRole = personaId(req.persona);
  if (req.country !== undefined) user.country = req.country.toLowerCase();
  if (req.city !== undefined) user.city = req.city;
  if (req.bio !== undefined) user.bio = req.bio;
  if (req.avatarUrl !== undefined) user.avatarUrl = req.avatarUrl;
  const b = req.business;
  if (!b) return { user, biz: null };
  const biz: BusinessPatch = {};
  if (b.taxCode !== undefined) biz.taxCode = b.taxCode;
  if (b.companyName !== undefined) biz.companyName = b.companyName;
  if (b.field !== undefined) biz.mainField = b.field;
  if (b.size !== undefined) biz.size = b.size;
  if (b.position !== undefined) biz.position = b.position;
  if (b.website !== undefined) biz.website = b.website;
  return { user, biz };
}

/** D-40: đã xác minh → MST + tên DN chỉ admin đổi (gửi lại giá trị cũ thì không tính là đổi) */
export function touchesLockedBiz(row: ProfileRow, biz: BusinessPatch | null): boolean {
  const cur = row.businessProfile;
  if (!biz || cur?.verification !== 'verified') return false;
  return (
    (biz.taxCode !== undefined && biz.taxCode !== cur.taxCode) ||
    (biz.companyName !== undefined && biz.companyName !== cur.companyName)
  );
}
