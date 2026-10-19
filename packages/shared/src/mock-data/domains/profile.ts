import type { ChangePasswordRequest, Profile, UpdateProfileRequest } from '../../api-domains';
import { PROFILE_MESSAGES } from '../../api-domains';
import { demoAccounts, members } from '../../fixtures';
import { MOCK_OTP } from '../auth';
import type { MemberSeed } from '../../fixtures';
import { mockDb, type MockDb } from './store';
import { conflict, isoFromVnDate, ok, type MockResult } from './util';

/**
 * Hồ sơ cá nhân (UP-06, P-89 → P-95). Trạng thái sửa đổi gắn với đối tượng `MockDb` hiện tại
 * nên `resetMockDb()` tự trả về seed — không cần sửa store chung.
 */

interface ProfileState {
  edits: Map<string, Partial<Profile>>;
  passwords: Map<string, string>;
  sso: Map<string, Set<string>>;
  /** BUG-030: TK chỉ đăng nhập qua SSO (chưa có mật khẩu) — e2e bật bằng cookie */
  ssoOnly: Set<string>;
  /** Email mới đang chờ OTP theo user */
  pendingEmail: Map<string, string>;
}

const states = new WeakMap<MockDb, ProfileState>();
function stateOf(): ProfileState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = {
      edits: new Map(),
      passwords: new Map(),
      sso: new Map(),
      ssoOnly: new Set(),
      pendingEmail: new Map(),
    };
    states.set(db, s);
  }
  return s;
}

/** Prototype: mọi TK mặc định đã liên kết Google + LinkedIn */
const DEFAULT_SSO = ['google', 'linkedin'];
/** Số phiên khác của TK demo bị đăng xuất (prototype: 2 thiết bị) */
const OTHER_SESSIONS = 2;

const COUNTRY_BY_NAME: Record<string, string> = {
  'Việt Nam': 'vn',
  'Thái Lan': 'th',
  Indonesia: 'id',
  Malaysia: 'my',
  Philippines: 'ph',
  Singapore: 'sg',
  Myanmar: 'mm',
  Campuchia: 'kh',
  Lào: 'la',
  Brunei: 'bn',
};

function baseProfile(
  m: MemberSeed,
): Omit<Profile, 'stats' | 'linkedSso' | 'status' | 'hasPassword'> {
  const isBiz = m.type === 'biz';
  return {
    id: m.id,
    fullName: m.name,
    email: m.email,
    accountType: isBiz ? 'business' : 'personal',
    systemRole: 'member',
    avatarUrl: null,
    membershipFee: null,
    phone: { country: m.cc || 'vn', number: m.phone.replace(/^\+\d+\s*/, '') },
    persona: m.persona ?? '',
    country: COUNTRY_BY_NAME[m.bizCountry ?? ''] ?? 'vn',
    city: '',
    bio: '',
    joinedAt: isoFromVnDate(m.date),
    business: isBiz
      ? {
          taxCode: m.tax ?? '',
          companyName: m.company ?? m.org ?? '',
          field: m.field ?? '',
          size: m.size ?? '',
          position: m.position ?? '',
          website: '',
          verification: m.verify === 'pending' ? 'pending' : 'verified',
        }
      : null,
  };
}

function statsOf(userId: string, fullName: string): Profile['stats'] {
  const db = mockDb();
  const mine = db.groupMembers.get(userId);
  const groups = mine ? [...mine.values()].filter((s) => s === 'member').length : 0;
  const events = [...db.eventRegs.values()].filter((set) => set.has(userId)).length;
  const projects = db.projects.filter((p) => p.ownerName === fullName).length;
  return { groups, events, projects };
}

export function getProfile(userId: string): MockResult<Profile> {
  const m = members.find((x) => x.id === userId);
  if (!m) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ' };
  const s = stateOf();
  const base = baseProfile(m);
  const merged = { ...base, ...s.edits.get(userId) };
  // Tên trong dự án theo seed gốc — đổi tên hiển thị không làm mất dự án của mình
  const stats = statsOf(userId, m.name);
  return ok({
    ...merged,
    status: mockDb().userStatus.get(userId) ?? 'active',
    stats,
    linkedSso: [...(s.sso.get(userId) ?? DEFAULT_SSO)],
    hasPassword: !s.ssoOnly.has(userId),
  });
}

export function updateProfile(userId: string, patch: UpdateProfileRequest): MockResult<Profile> {
  const cur = getProfile(userId);
  if (!cur.ok) return cur;
  const s = stateOf();
  const prev = s.edits.get(userId) ?? {};
  const { business, ...rest } = patch;
  let nextBiz = cur.data.business;
  if (business && nextBiz) {
    const locked = nextBiz.verification === 'verified';
    if (locked && (business.taxCode !== undefined || business.companyName !== undefined)) {
      const changed =
        (business.taxCode ?? nextBiz.taxCode) !== nextBiz.taxCode ||
        (business.companyName ?? nextBiz.companyName) !== nextBiz.companyName;
      if (changed)
        return { ok: false, status: 403, code: 'FORBIDDEN', message: PROFILE_MESSAGES.bizLocked };
    }
    nextBiz = { ...nextBiz, ...defined(business) };
  }
  s.edits.set(userId, { ...prev, ...defined(rest), ...(nextBiz ? { business: nextBiz } : {}) });
  return getProfile(userId);
}

/** Bỏ khoá `undefined` (zod `.partial()` cho phép) trước khi gộp */
function defined<T extends object>(o: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

const passwordOf = (userId: string) =>
  stateOf().passwords.get(userId) ??
  demoAccounts.find((a) => a.meId === userId)?.pwd ??
  'User@2026';

/** Sai mật khẩu hiện tại → `false` (handler trả 400 VALIDATION_ERROR) */
export function changePassword(userId: string, input: ChangePasswordRequest): boolean {
  if (input.currentPassword !== passwordOf(userId)) return false;
  stateOf().passwords.set(userId, input.newPassword);
  return true;
}

/** Mock: luôn còn 2 phiên khác (prototype) — backend thật thu hồi refresh token theo user */
export const revokeOtherSessions = () => ok({ revoked: OTHER_SESSIONS });

export function setSsoLink(
  userId: string,
  provider: string,
  linked: boolean,
): MockResult<{ provider: string; linked: boolean }> {
  const s = stateOf();
  const set = new Set(s.sso.get(userId) ?? DEFAULT_SSO);
  // BUG-030, NA-17: TK chưa có mật khẩu không huỷ được liên kết cuối cùng
  if (!linked && s.ssoOnly.has(userId) && set.has(provider) && set.size <= 1) {
    return conflict(PROFILE_MESSAGES.lastSso);
  }
  if (linked) set.add(provider);
  else set.delete(provider);
  s.sso.set(userId, set);
  return ok({ provider, linked });
}

/** e2e (cookie `opchub-mock-sso-only`): TK chỉ có liên kết Google, chưa đặt mật khẩu */
export function markSsoOnly(userId: string): void {
  const s = stateOf();
  if (s.ssoOnly.has(userId)) return;
  s.ssoOnly.add(userId);
  s.sso.set(userId, new Set(['google']));
}

function emailTakenBy(userId: string, email: string): boolean {
  const edits = stateOf().edits;
  return members.some((m) => {
    if (m.id === userId) return false;
    const cur = edits.get(m.id)?.email ?? m.email;
    return cur.toLowerCase() === email;
  });
}

/** BUG-030 `POST /me/email/otp`: kiểm như server, ghi email chờ xác nhận (OTP cố định MOCK_OTP) */
export function requestEmailChange(
  userId: string,
  newEmail: string,
): MockResult<{ email: string; expiresInSec: number }> {
  const cur = getProfile(userId);
  if (!cur.ok) return cur;
  if (cur.data.email.toLowerCase() === newEmail) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: PROFILE_MESSAGES.emailSame,
    };
  }
  if (emailTakenBy(userId, newEmail)) return conflict(PROFILE_MESSAGES.emailTaken);
  stateOf().pendingEmail.set(userId, newEmail);
  return ok({ email: newEmail, expiresInSec: 600 });
}

/** `POST /me/email/verify`: `null` = mã sai / chưa gửi mã (handler trả 422 OTP_INVALID) */
export function verifyEmailChange(
  userId: string,
  newEmail: string,
  code: string,
): MockResult<Profile> | null {
  const s = stateOf();
  if (s.pendingEmail.get(userId) !== newEmail || code !== MOCK_OTP) return null;
  if (emailTakenBy(userId, newEmail)) return conflict(PROFILE_MESSAGES.emailTaken);
  s.pendingEmail.delete(userId);
  s.edits.set(userId, { ...s.edits.get(userId), email: newEmail });
  return getProfile(userId);
}
