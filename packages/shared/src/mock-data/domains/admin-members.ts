import type {
  AdminMember,
  AdminMemberFilter,
  AdminMemberType,
  BizVerification,
} from '../../api-domains';
import { members, registrationRoles } from '../../fixtures';
import type { MemberSeed } from '../../fixtures';
import { mockDb, type MockDb } from './store';
import {
  conflict,
  DAY_MS,
  includesText,
  isoFromVnDate,
  MOCK_NOW,
  notFound,
  ok,
  type MockResult,
} from './util';
import { adminOnboardingFor } from './onboarding';
import { freshOnboarding } from './onboarding-snapshot';
import { registeredMockProfiles } from './registration/state';

/**
 * Màn Thành viên của Admin (D-07 → D-17). Xác minh DN sửa đổi gắn với `MockDb`
 * hiện tại nên `resetMockDb()` tự về seed. Trạng thái khoá dùng chung `db.userStatus`.
 */

interface AdminMemberState {
  verification: Map<string, BizVerification>;
}

const states = new WeakMap<MockDb, AdminMemberState>();
function stateOf(): AdminMemberState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { verification: new Map(PENDING_BIZ.map((id) => [id, 'pending'])) };
    states.set(db, s);
  }
  return s;
}

/**
 * D-40: MST nước ngoài không tra được qua adapter MST Việt Nam → "Chờ xác minh".
 * Prototype không có hồ sơ chờ (D-16 vẫn dùng m1 đã xác minh) — seed để có luồng duyệt tay.
 */
const PENDING_BIZ: readonly string[] = ['m7'];

const typeOf = (m: MemberSeed): AdminMemberType => (m.type === 'biz' ? 'business' : 'personal');

function toAdminMember(m: MemberSeed): AdminMember {
  const db = mockDb();
  const s = stateOf();
  const groups = db.groupMembers.get(m.id);
  const isBiz = m.type === 'biz';
  return {
    id: m.id,
    accountType: typeOf(m),
    fullName: m.name,
    email: m.email,
    phone: m.phone,
    country: m.cc || 'vn',
    organization: m.org ?? '',
    persona: m.persona ?? '',
    status: db.userStatus.get(m.id) ?? 'active',
    createdAt: isoFromVnDate(m.date),
    groupIds: groups ? [...groups].filter(([, st]) => st === 'member').map(([g]) => g) : [],
    onboarding: adminOnboardingFor(m.id) ?? freshOnboarding(typeOf(m)),
    business: isBiz
      ? {
          taxCode: m.tax ?? '',
          companyName: m.company ?? m.org ?? '',
          field: m.field ?? '',
          size: m.size ?? '',
          country: m.bizCountry ?? '',
          position: m.position ?? '',
          verification: s.verification.get(m.id) ?? 'verified',
        }
      : null,
  };
}

const matches = (m: AdminMember, q: string | undefined) =>
  !q ||
  includesText(m.fullName, q) ||
  includesText(m.email, q) ||
  m.phone.includes(q) ||
  includesText(m.business?.companyName ?? '', q);

/** Mới tham gia lên đầu như server (`ORDER BY created_at DESC, id DESC` — D-63, Q-B62-18) */
const newestFirst = (a: AdminMember, b: AdminMember) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

/** V4-611: TK đăng ký trong phiên cũng tính lại x/8 từ kho mock (như server) */
const withOnboarding = (m: AdminMember): AdminMember => ({
  ...m,
  onboarding: adminOnboardingFor(m.id) ?? m.onboarding,
});

/** V4-611 lọc "Khởi đầu": Đã hoàn tất = 8/8 */
const onboardingMatches = (m: AdminMember, f: AdminMemberFilter['onboarding']) =>
  !f || (f === 'done') === (m.onboarding.missing.length === 0);

/** Đã đóng phí = phí đang hiệu lực (như server: `membership_fees.status` active / expiring) */
const isPaid = (id: string) =>
  mockDb().fees.some((f) => f.userId === id && (f.status === 'active' || f.status === 'expiring'));

/** Vai trò đăng ký của seed: id (expert…) từ nhãn "Bạn là"; DN = `business` */
const roleIdOf = (m: AdminMember) =>
  m.accountType === 'business'
    ? 'business'
    : (registrationRoles.find((r) => r.label === m.persona)?.id ?? m.persona);

/** Hồ sơ chưa khai báo: DN chưa có MST (prototype `_mfOk` prof) */
const profileIncomplete = (m: AdminMember) =>
  m.accountType === 'business' && !(m.business?.taxCode ?? '').trim();

/** Thanh lọc v4 (`_mfOk`): cùng nghĩa với `adminMemberWhere` của server */
function filterMatches(m: AdminMember, f: AdminMemberFilter): boolean {
  if (f.type && m.accountType !== f.type) return false;
  if (!matches(m, f.q) || !onboardingMatches(m, f.onboarding)) return false;
  if (f.group && !m.groupIds.includes(f.group)) return false;
  if (f.role && roleIdOf(m) !== f.role) return false;
  if (f.fee && (f.fee === 'paid') !== isPaid(m.id)) return false;
  if (f.status && m.status !== f.status) return false;
  if (f.profile && (f.profile === 'inc') !== profileIncomplete(m)) return false;
  if (f.days && Date.parse(m.createdAt) < MOCK_NOW - f.days * DAY_MS) return false;
  return true;
}

/** Danh sách xếp như server + số đếm theo loại cho chip lọc */
export function listAdminMembers(f: AdminMemberFilter = {}) {
  const all = [...members.map(toAdminMember), ...registeredMockProfiles().map(withOnboarding)].sort(
    newestFirst,
  );
  return {
    items: all.filter((m) => filterMatches(m, f)),
    counts: {
      all: all.length,
      business: all.filter((m) => m.accountType === 'business').length,
      personal: all.filter((m) => m.accountType === 'personal').length,
    },
  };
}

/** Khoá / mở khoá hàng loạt: bỏ qua TK đã ở trạng thái đích (idempotent) */
export { setMockMembersStatus as setUsersStatus } from './member-lifecycle';

/** D-40: chỉ hồ sơ "Chờ xác minh" mới duyệt / từ chối được (cập nhật có điều kiện) */
export function decideBizVerification(
  userId: string,
  decision: 'approve' | 'reject',
): MockResult<AdminMember> {
  const m = members.find((x) => x.id === userId);
  if (!m) return notFound('Không tìm thấy thành viên');
  if (m.type !== 'biz') return conflict('Tài khoản cá nhân không cần xác minh doanh nghiệp');
  const s = stateOf();
  if ((s.verification.get(userId) ?? 'verified') !== 'pending')
    return conflict('Hồ sơ không ở trạng thái chờ xác minh');
  s.verification.set(userId, decision === 'approve' ? 'verified' : 'rejected');
  return ok(toAdminMember(m));
}
