import { members, registrationRoles } from '@opchub/shared/fixtures';
import type { MemberSeed } from '@opchub/shared/fixtures';
import {
  avatarOf,
  avatarUrl,
  DAY_MS,
  isoFromVnDate,
  LOCKED_USERS,
  MOCK_NOW,
  PEOPLE,
} from '@opchub/shared/mock-domains';
import { UNPAID_DEMO } from '@opchub/shared/mock-data';
import type { AccountType, SystemRole } from '../../src/index';

/**
 * Danh bạ người của seed demo: 8 thành viên M1–M8 (giữ id prototype), tài khoản quản trị,
 * nhà đầu tư và "hồ sơ phụ" — những người mock nhắc tên (tác giả tin/góp ý, người xin vào nhóm,
 * người nhận mail chào mừng) nhưng KHÔNG thuộc 8 thành viên mà e2e đếm (Q-B62-1: xoá mềm).
 */

export interface DemoUser {
  id: string;
  memberCode: string;
  accountType: AccountType;
  fullName: string;
  email: string;
  phone: string | null;
  country: string;
  registrationRole: string | null;
  position: string | null;
  systemRole: SystemRole;
  status: 'active' | 'locked';
  avatarUrl: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  /** Đặt mật khẩu demo (User@2026) — null với hồ sơ phụ / quản trị không đăng nhập */
  login: boolean;
}

const at = (ms: number) => new Date(ms);
const GHOST_SINCE = at(MOCK_NOW - 30 * DAY_MS);

/**
 * Vai trò hệ thống: mọi thành viên là `member` (D-52, TIP-V2-202 — nhân sự quản trị ở `admin_users`,
 * vai trò trong nhóm là khái niệm riêng D-58). Migration 20261019100000 đưa m2/m3 về member.
 */
const ROLE: Record<string, SystemRole> = {};

/** Email đăng nhập khác fixture: TK chưa đóng phí của mock dùng do.haiyen@opchub.vn (Q-B62-3) */
const EMAIL_OVERRIDE: Record<string, string> = { [UNPAID_DEMO.meId]: UNPAID_DEMO.email };

export const toE164 = (p: string) => `+${p.replace(/\D/g, '')}`;

const positionOf = (m: MemberSeed) =>
  m.position ?? PEOPLE.find((p) => p[4] === m.name)?.[5] ?? null;

const roleIdOf = (label: string | undefined) =>
  registrationRoles.find((r) => r.label === label)?.id ?? null;

function memberUser(m: MemberSeed, i: number): DemoUser {
  const isBiz = m.type === 'biz';
  return {
    id: m.id,
    memberCode: `TV${String(i + 1).padStart(6, '0')}`,
    accountType: isBiz ? 'business' : 'personal',
    fullName: m.name,
    email: EMAIL_OVERRIDE[m.id] ?? m.email,
    phone: toE164(m.phone),
    country: m.cc || 'vn',
    registrationRole: isBiz ? null : roleIdOf(m.persona),
    position: positionOf(m),
    systemRole: ROLE[m.id] ?? 'member',
    status: LOCKED_USERS.includes(m.id) ? 'locked' : 'active',
    avatarUrl: avatarOf(m.name),
    createdAt: new Date(isoFromVnDate(m.date)),
    deletedAt: null,
    login: true,
  };
}

/** Slug tên như mock event-admin (`g-<slug>`, email `<slug>@opchub.vn`) */
export const slugOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.');

interface ExtraSpec {
  id: string;
  name: string;
  email?: string;
  ph?: string | null;
  createdAt?: Date;
}

function extraUser(s: ExtraSpec, n: number, accountType: AccountType): DemoUser {
  return {
    id: s.id,
    memberCode: `TV${String(900000 + n).padStart(6, '0')}`,
    accountType,
    fullName: s.name,
    email: s.email ?? `${slugOf(s.name)}@opchub.vn`,
    phone: null,
    country: 'vn',
    registrationRole: null,
    position: null,
    systemRole: 'member',
    status: 'active',
    avatarUrl: s.ph === undefined ? avatarOf(s.name) : avatarUrl(s.ph),
    createdAt: s.createdAt ?? GHOST_SINCE,
    deletedAt: accountType === 'investor' ? null : GHOST_SINCE,
    login: false,
  };
}

/** Người mock nhắc tên nhưng không thuộc 8 thành viên — xoá mềm để không lọt vào danh sách đếm */
const GHOSTS: ExtraSpec[] = [
  { id: 'g-pham.thu.ha', name: 'Phạm Thu Hà' },
  { id: 'g-vu.duc.long', name: 'Vũ Đức Long' },
  { id: 'g-an-danh', name: 'Tài khoản ẩn danh', ph: null },
  { id: 'g-hoang.thi.lan', name: 'Hoàng Thị Lan', email: 'hoang.lan@gmail.com', ph: null },
  { id: 'g-tran.quang.minh', name: 'Trần Quang Minh', email: 'minh.tran@solostudio.vn', ph: null },
];

/** Nhà đầu tư ngoài 8 thành viên (INV_SEED) — loại `investor`, không đóng phí (D-14) */
const INVESTORS: ExtraSpec[] = [
  { id: 'inv-nam', name: 'Nguyễn Hoàng Nam', email: 'nam.nguyen@vinacapital.vn', ph: 'men/41' },
  { id: 'inv-mai', name: 'Trần Thị Mai', email: 'mai.tran@saomai.vn', ph: 'women/52' },
];

/**
 * `ad1` (ADMIN_SEED cũ) — người thao tác trong nhật ký demo. Không có trong `stAdmins` ver2 (V2Q-115)
 * → chỉ còn dòng `users` xoá mềm như migration 20261019100000 (giữ tên cho nhật ký), không đăng nhập,
 * không là người nhận chiến dịch (D-52).
 */
const OWNER: DemoUser = {
  ...extraUser({ id: 'ad1', name: 'Nguyễn Văn An', ph: 'men/11' }, 99, 'personal'),
  email: 'ad1@moved.invalid',
  phone: null,
  systemRole: 'super_admin',
  deletedAt: GHOST_SINCE,
};

export const MEMBER_USERS: DemoUser[] = members.map(memberUser);
export const GHOST_USERS: DemoUser[] = GHOSTS.map((g, i) => extraUser(g, i + 1, 'personal'));
export const INVESTOR_USERS: DemoUser[] = INVESTORS.map((s, i) => extraUser(s, 50 + i, 'investor'));

/** Mọi user seed demo tạo lại mỗi lần chạy (TK `admin` của seed bắt buộc chỉ cập nhật) */
export const DEMO_USERS: DemoUser[] = [...MEMBER_USERS, ...GHOST_USERS, ...INVESTOR_USERS, OWNER];
export const DEMO_USER_IDS: string[] = DEMO_USERS.map((u) => u.id);

/** Tài khoản Admin của seed bắt buộc (D-29) — e2e đăng nhập bằng mật khẩu prototype */
export const ADMIN_ID = 'admin';

const byName = new Map<string, string>();
for (const u of [...MEMBER_USERS, ...GHOST_USERS, ...INVESTOR_USERS]) {
  if (!byName.has(u.fullName)) byName.set(u.fullName, u.id);
}

/** Tên hiển thị trong seed prototype → user id (null nếu không có ai mang tên đó) */
export const userIdByName = (name: string): string | null => byName.get(name) ?? null;

export function requireUserId(name: string): string {
  const id = userIdByName(name);
  if (!id) throw new Error(`Seed demo: không có user tên "${name}"`);
  return id;
}

const byEmail = new Map(DEMO_USERS.map((u) => [u.email.toLowerCase(), u.id]));
export const userIdByEmail = (email: string): string | null =>
  byEmail.get(email.toLowerCase()) ?? null;
