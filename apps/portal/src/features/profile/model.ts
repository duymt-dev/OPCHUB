import {
  passwordScore,
  PROFILE_MESSAGES,
  type EventItem,
  type GroupItem,
  type UpdateProfileRequest,
} from '@opchub/shared/api-domains';
import type { ActivityEvent, ActivityGroup, Profile, ProfileDraft, ProfileValues } from './types';
import { formatLocale } from '@/i18n/format';

/** Logic thuần của màn Hồ sơ — test ở model.spec.ts */

export function valuesOf(p: Profile, d: ProfileDraft): ProfileValues {
  const b = p.business;
  return {
    fullName: d.fullName ?? p.fullName,
    email: p.email,
    phoneCountry: d.phoneCountry ?? p.phone.country,
    phoneNumber: d.phoneNumber ?? p.phone.number,
    persona: d.persona ?? p.persona,
    country: d.country ?? p.country,
    city: d.city ?? p.city,
    bio: d.bio ?? p.bio,
    taxCode: d.taxCode ?? b?.taxCode ?? '',
    companyName: d.companyName ?? b?.companyName ?? '',
    field: d.field ?? b?.field ?? '',
    size: d.size ?? b?.size ?? '',
    position: d.position ?? b?.position ?? '',
    website: d.website ?? b?.website ?? '',
  };
}

export type SaveCheck =
  { ok: true; patch: UpdateProfileRequest | null } | { ok: false; error: string };

const EMAIL_RE = /.+@.+\..+/;
const BIZ_KEYS = ['taxCode', 'companyName', 'field', 'size', 'position', 'website'] as const;

/** Email hợp lệ (cùng luật prototype) — dùng cho ô email mới của hộp đổi email (BUG-030) */
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

/**
 * Kiểm như prototype (chỉ trường đã sửa): họ tên trống → lỗi. Email không nằm trong PATCH
 * (BUG-030 — đổi qua OTP). MST / tên DN bỏ khỏi patch khi DN đã xác minh (D-40).
 * `patch: null` = không có gì để gửi.
 */
export function buildPatch(p: Profile, d: ProfileDraft): SaveCheck {
  if (d.fullName !== undefined && !d.fullName.trim())
    return { ok: false, error: PROFILE_MESSAGES.nameRequired };

  const v = valuesOf(p, d);
  const patch: UpdateProfileRequest = {};
  if (d.fullName !== undefined) patch.fullName = d.fullName.trim();
  if (d.phoneCountry !== undefined || d.phoneNumber !== undefined)
    patch.phone = { country: v.phoneCountry, number: v.phoneNumber };
  if (d.persona !== undefined) patch.persona = d.persona;
  if (d.country !== undefined) patch.country = d.country;
  if (d.city !== undefined) patch.city = d.city;
  if (d.bio !== undefined) patch.bio = d.bio;

  const locked = p.business?.verification === 'verified';
  const business: NonNullable<UpdateProfileRequest['business']> = {};
  for (const k of BIZ_KEYS) {
    const val = d[k];
    if (val === undefined || (locked && (k === 'taxCode' || k === 'companyName'))) continue;
    business[k] = val;
  }
  if (p.business && Object.keys(business).length) patch.business = business;

  return { ok: true, patch: Object.keys(patch).length ? patch : null };
}

export type PasswordCheck = { ok: true } | { ok: false; error: string };

/** Thứ tự kiểm như prototype: thiếu hiện tại → chưa đủ mạnh → xác nhận lệch */
export function checkPassword(cur: string, next: string, confirm: string): PasswordCheck {
  if (!cur) return { ok: false, error: PROFILE_MESSAGES.currentRequired };
  if (passwordScore(next) < 3) return { ok: false, error: PROFILE_MESSAGES.weakPassword };
  if (next !== confirm) return { ok: false, error: PROFILE_MESSAGES.confirmMismatch };
  return { ok: true };
}

export type BarTone = 'off' | 'weak' | 'fair' | 'strong';

/** 4 vạch độ mạnh: < 2 đỏ, < 4 vàng, 4 xanh */
export function strengthBars(pwd: string): { score: number; bars: BarTone[] } {
  const score = passwordScore(pwd);
  const tone: BarTone = score < 2 ? 'weak' : score < 4 ? 'fair' : 'strong';
  return { score, bars: [0, 1, 2, 3].map((i) => (i < score ? tone : 'off')) };
}

/** Hai chữ cái đầu của hai từ cuối ("OPC Hà Nội" → "HN") */
export const monoOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Nhóm đã tham gia trước, rồi nhóm chờ duyệt; giữ thứ tự gốc để lấy tông màu */
export function activityGroups(groups: GroupItem[]): ActivityGroup[] {
  const pick = (s: GroupItem['myStatus']): ActivityGroup[] =>
    groups.flatMap((g, order) =>
      g.myStatus === s
        ? [
            {
              id: g.id,
              name: g.name,
              mono: monoOf(g.name),
              order,
              members: g.memberCount,
              region: g.region,
              pending: s === 'pending',
            },
          ]
        : [],
    );
  return [...pick('member'), ...pick('pending')];
}

/** "T7, 25/10" → thứ "T7", ngày "25" */
export function activityEvents(events: EventItem[]): ActivityEvent[] {
  return events
    .filter((e) => e.registeredByMe)
    .map((e) => {
      const [dow = '', dm = ''] = e.day.split(', ');
      return {
        id: e.id,
        dow,
        dnum: dm.split('/')[0] ?? '',
        title: e.title,
        time: e.time,
        place: e.place,
      };
    });
}

/** ISO → dd/mm/yyyy theo giờ Việt Nam */
export function vnDate(isoStr: string): string {
  return new Intl.DateTimeFormat(formatLocale(), {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoStr));
}
