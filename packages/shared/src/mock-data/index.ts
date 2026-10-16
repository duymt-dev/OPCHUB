import type { EventSummary, GroupSummary, Me, MemberRow } from '../api';
import { communities, demoAccounts, events, members, regionOf } from '../fixtures';
import { memberCode, UNPAID_DEMO, unpaidMe } from './auth';

export * from './auth';

/**
 * Chuyển seed prototype sang DTO đúng hợp đồng API (SRS §13).
 * Dùng chung cho MSW của Portal và Admin; không chứa logic UI.
 */

const isoFromVn = (d: string) => {
  const [dd, mm, yyyy] = d.split('/');
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
};

export const mockMembers: MemberRow[] = members.map((m) => ({
  id: m.id,
  accountType: m.type === 'biz' ? 'business' : 'personal',
  fullName: m.name,
  email: m.email,
  phone: m.phone,
  role: m.role,
  status: 'active',
  createdAt: isoFromVn(m.date),
  groupIds: m.groups,
}));

export const mockGroups: GroupSummary[] = communities.map((c) => ({
  id: c.id,
  name: c.name,
  province: c.province,
  region: regionOf(c.province),
  memberCount: c.members,
  weeklyActive: c.weekly,
  description: c.desc,
}));

export const mockEvents: EventSummary[] = events.map((e) => ({
  id: e.id,
  title: e.title,
  mode: e.mode === 'Online' ? 'online' : 'offline',
  day: e.day,
  time: e.time,
  place: e.place,
  seats: e.seats,
  registered: e.reg,
  description: e.desc,
}));

const ADMIN_ME: Me = {
  id: 'admin',
  fullName: 'Quản trị hệ thống',
  email: 'admin@opchub.community',
  accountType: 'personal',
  systemRole: 'super_admin',
  status: 'active',
  avatarUrl: null,
  membershipFee: null,
};

function memberMe(id: string): Me | undefined {
  const m = members.find((x) => x.id === id);
  if (!m) return undefined;
  return {
    id: m.id,
    fullName: m.name,
    email: m.email,
    accountType: m.type === 'biz' ? 'business' : 'personal',
    systemRole: 'member',
    status: 'active',
    avatarUrl: null,
    membershipFee: {
      status: 'active',
      validUntil: '2027-03-02T00:00:00.000Z',
      transferRef: `OPCHUB ${memberCode(m.id)}`,
      amount: 600000,
    },
  };
}

export type MockLoginResult = { ok: true; me: Me } | { ok: false };

/** Kiểm tài khoản demo của prototype (email không phân biệt hoa thường) */
export function mockLogin(identifier: string, password: string): MockLoginResult {
  const acc = demoAccounts.find(
    (a) => a.email.toLowerCase() === identifier.trim().toLowerCase() && a.pwd === password,
  );
  if (!acc) {
    const unpaid =
      UNPAID_DEMO.email === identifier.trim().toLowerCase() && UNPAID_DEMO.pwd === password;
    const me = unpaid ? unpaidMe() : undefined;
    return me ? { ok: true, me } : { ok: false };
  }
  const me = acc.role === 'admin' ? ADMIN_ME : memberMe(acc.meId ?? '');
  return me ? { ok: true, me } : { ok: false };
}

/** Cắt trang theo api-conventions (page vượt quá → items rỗng, total thật) */
export function paginate<T>(items: T[], page: number, size: number) {
  const start = (page - 1) * size;
  return { items: items.slice(start, start + size), page, size, total: items.length };
}
