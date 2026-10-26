import type {
  AdminMember,
  AdminMemberType,
  AdminOnboardingFilter,
  BizVerification,
} from '../../api-domains';
import { members } from '../../fixtures';
import type { MemberSeed } from '../../fixtures';
import { mockDb, type MockDb } from './store';
import { conflict, includesText, isoFromVnDate, notFound, ok, type MockResult } from './util';
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
const onboardingMatches = (m: AdminMember, f: AdminOnboardingFilter | undefined) =>
  !f || (f === 'done') === (m.onboarding.missing.length === 0);

/** Danh sách xếp như server + số đếm theo loại cho chip lọc */
export function listAdminMembers(
  type: AdminMemberType | undefined,
  q: string | undefined,
  onboarding?: AdminOnboardingFilter,
) {
  const all = [...members.map(toAdminMember), ...registeredMockProfiles().map(withOnboarding)].sort(
    newestFirst,
  );
  return {
    items: all.filter(
      (m) => (!type || m.accountType === type) && matches(m, q) && onboardingMatches(m, onboarding),
    ),
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
