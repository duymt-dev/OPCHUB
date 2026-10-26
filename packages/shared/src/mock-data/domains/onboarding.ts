import {
  type AdminOnboarding,
  ONBOARDING_FLAGS,
  ONBOARDING_MAIL_DEFAULT,
  ONBOARDING_MESSAGES,
  ONBOARDING_SHORT,
  type Onboarding,
  type OnboardingFlag,
  type OnboardingMail,
} from '../../api-domains';
import { members, registrationRoles } from '../../fixtures';
import { adminOnboardingOf, onboardingOf, type OnboardingSnapshot } from '../../onboarding/steps';
import { recordAudit } from './audit-store';
import { chatState } from './chat-store';
import { avatarOf } from './community';
import { ownerHasMockFundraising } from './fundraising';
import { marketingState } from './marketing';
import { mockNeeds } from './needs-store';
import { publishMockNotification } from './notification-runtime';
import { getProfile } from './profile';
import { registeredMockProfiles } from './registration/state';
import { mockDb, nextId } from './store';
import type { MockDb } from './store-types';
import { mockStores } from './stores';
import { conflict, iso, notFound, ok, type MockResult } from './util';

/**
 * Chỉ cho MSW/e2e — Hướng dẫn bắt đầu 8 bước (V4-611, D-85, D-88) như server: ảnh chụp dữ liệu
 * nguồn dựng từ kho mock (phí, hồ sơ, nhóm, chat, gian hàng, dự án, nhu cầu, cờ, sự kiện, gọi vốn)
 * rồi qua `onboardingOf` / `adminOnboardingOf` dùng chung với server. Cờ + lần nhắc gắn với MockDb
 * hiện tại nên `resetMockDb()` tự về seed.
 */
interface OnboardingState {
  flags: Map<string, Set<OnboardingFlag>>;
  /** userId → mốc nhắc gần nhất (ms) — D-88: ≤ 1 lần / 24 giờ */
  reminded: Map<string, number>;
  mail: OnboardingMail;
}

const DAY_MS = 86_400_000;
const states = new WeakMap<MockDb, OnboardingState>();

/**
 * Cờ mẫu như prototype `_ob` (thành viên khác TK đang xem: "Khám phá" = đã phí và có nhóm): Cá nhân
 * seed đã đóng phí và đang ở nhóm có sẵn cờ `explore`. TK demo M1 là DN nên không cần cờ này.
 */
function seedFlags(db: MockDb): Map<string, Set<OnboardingFlag>> {
  const out = new Map<string, Set<OnboardingFlag>>();
  for (const m of members) {
    const paid = db.fees.some((f) => f.userId === m.id && f.paidAt !== null);
    const grp = [...(db.groupMembers.get(m.id)?.values() ?? [])].includes('member');
    if (m.type === 'per' && paid && grp) out.set(m.id, new Set(['explore']));
  }
  return out;
}

function stateOf(): OnboardingState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { flags: seedFlags(db), reminded: new Map(), mail: { ...ONBOARDING_MAIL_DEFAULT } };
    states.set(db, s);
  }
  return s;
}

interface Person {
  id: string;
  name: string;
  email: string;
  accountType: 'business' | 'personal';
}

function personOf(userId: string): Person | null {
  const m = members.find((x) => x.id === userId);
  if (m)
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      accountType: m.type === 'biz' ? 'business' : 'personal',
    };
  const r = registeredMockProfiles().find((x) => x.id === userId);
  return r ? { id: r.id, name: r.fullName, email: r.email, accountType: r.accountType } : null;
}

function paidOf(userId: string, now: number): boolean {
  const f = mockDb().fees.find((x) => x.userId === userId);
  return (
    !!f &&
    (f.status === 'active' || f.status === 'expiring') &&
    !!f.validUntil &&
    Date.parse(f.validUntil) > now
  );
}

const memberGroups = (userId: string) =>
  [...(mockDb().groupMembers.get(userId) ?? [])].filter(([, st]) => st === 'member');

/**
 * Hồ sơ đủ (D-85): DN — người đại diện, MST, ngành chính, ảnh đại diện; Cá nhân — "Bạn là", OPC
 * muốn tham gia (nhóm đang là thành viên như backfill), ảnh, SĐT. Ảnh seed như seed DB (`avatarOf`);
 * TK đăng ký trong phiên chưa có ảnh.
 */
function profileOf(p: Person): boolean {
  const r = getProfile(p.id);
  if (!r.ok) return false;
  const pr = r.data;
  const avatar = pr.avatarUrl ?? avatarOf(p.name);
  if (!avatar) return false;
  if (p.accountType === 'business')
    return !!pr.fullName.trim() && !!pr.business?.taxCode.trim() && !!pr.business.field.trim();
  const role = registrationRoles.some((x) => x.label === pr.persona || x.id === pr.persona);
  return role && memberGroups(p.id).length > 0 && !!pr.phone.number.trim();
}

/** Tin thật của thành viên (không tin bot mô phỏng, không tin đã ẩn) */
function chatOf(userId: string): boolean {
  const ext = chatState().ext;
  for (const list of mockDb().messages.values())
    if (list.some((m) => !m.isSimulated && !m.hiddenAt && ext.get(m.id)?.senderId === userId))
      return true;
  return false;
}

/** Ảnh chụp dữ liệu nguồn của một thành viên; null = không phải thành viên (NĐT / không có) */
export function mockOnboardingSnapshot(
  userId: string,
  now = Date.now(),
): OnboardingSnapshot | null {
  const p = personOf(userId);
  if (!p) return null;
  const db = mockDb();
  const flags = stateOf().flags.get(userId) ?? new Set<OnboardingFlag>();
  return {
    accountType: p.accountType,
    paid: paidOf(userId, now),
    profile: profileOf(p),
    group: memberGroups(userId).length > 0,
    chat: chatOf(userId),
    store: mockStores().some(
      (s) => s.ownerId === userId && s.status !== 'hidden' && (!!s.intro.trim() || s.itemCount > 0),
    ),
    project: db.projects.some((x) => x.ownerName === p.name),
    need: mockNeeds().some((n) => n.ownerId === userId),
    explore: flags.has('explore'),
    affiliateShare: flags.has('affiliate_share'),
    event: [...db.eventRegs.values()].some((set) => set.has(userId)),
    fundraising: ownerHasMockFundraising(p.name),
  };
}

/** `GET /me/onboarding` — null → 204 (NĐT) */
export function myMockOnboarding(userId: string): Onboarding | null {
  const s = mockOnboardingSnapshot(userId);
  return s ? onboardingOf(s) : null;
}

const remindedToday = (userId: string, now: number) => {
  const at = stateOf().reminded.get(userId);
  return at !== undefined && now - at < DAY_MS;
};

/** Cột "Khởi đầu" ở Admin › Thành viên */
export function adminOnboardingFor(userId: string, now = Date.now()): AdminOnboarding | null {
  const s = mockOnboardingSnapshot(userId, now);
  return s ? adminOnboardingOf(s, remindedToday(userId, now)) : null;
}

/** `POST /me/onboarding/flags/:key` — idempotent */
export function setMockOnboardingFlag(userId: string, key: OnboardingFlag): void {
  const flags = stateOf().flags;
  const set = flags.get(userId) ?? new Set<OnboardingFlag>();
  set.add(key);
  flags.set(userId, set);
}

const missingText = (keys: readonly string[]) =>
  keys.map((k) => ONBOARDING_SHORT[k as keyof typeof ONBOARDING_SHORT] ?? k).join(', ');

/**
 * D-88 "Nhắc": 409 khi đã đủ 8 bước, 429 khi đã nhắc trong 24 giờ; ghi audit, thông báo `system`
 * (link `/dashboard`) và một dòng nhật ký thư `onboarding` theo mẫu tạm.
 */
export function remindMockOnboarding(
  adminId: string,
  userId: string,
  now = Date.now(),
): MockResult<null> {
  const p = personOf(userId);
  const st = adminOnboardingFor(userId, now);
  if (!p || !st) return notFound('Không tìm thấy thành viên');
  if (!st.missing.length) return conflict(ONBOARDING_MESSAGES.remindDone);
  if (st.reminded)
    return {
      ok: false,
      status: 429,
      code: 'RATE_LIMITED',
      message: ONBOARDING_MESSAGES.remindTooSoon,
    };
  stateOf().reminded.set(userId, now);
  const missing = missingText(st.missing);
  recordAudit(adminId, 'member.onboarding_remind', userId, `Còn thiếu: ${missing}`);
  const id = nextId('onb');
  publishMockNotification(mockDb(), userId, {
    id,
    type: 'system',
    title: ONBOARDING_MESSAGES.remindTitle,
    body: `Còn thiếu: ${missing}`,
    link: '/dashboard',
    read: false,
    createdAt: iso(now),
  });
  const tpl = stateOf().mail;
  const fill = (x: string) =>
    x
      .replaceAll('{{ten}}', p.name)
      .replaceAll('{{con_thieu}}', missing)
      .replaceAll('{{link}}', '/dashboard');
  marketingState().log.unshift({
    id: `ml-${id}`,
    kind: 'onboarding',
    to: p.email,
    name: p.name,
    subject: fill(tpl.subject),
    sentAt: iso(now),
    status: 'sent',
    attempts: 0,
    error: null,
  });
  return ok(null);
}

export const getMockOnboardingMail = (): OnboardingMail => stateOf().mail;

export function saveMockOnboardingMail(adminId: string, tpl: OnboardingMail): OnboardingMail {
  stateOf().mail = { ...tpl };
  recordAudit(adminId, 'mail.onboarding.update', 'onboarding_mail', tpl.subject);
  return stateOf().mail;
}

/**
 * Cầu cờ qua tải lại trang / sang Admin (cùng host): cookie `opchub-mock-ob` = `uid:key,…`.
 * Chỉ cờ — dữ liệu nguồn khác đã có cầu riêng hoặc tính lại từ seed.
 */
export const ONBOARDING_FLAG_COOKIE = 'opchub-mock-ob';

export function syncOnboardingFlags(raw: string | undefined): void {
  if (!raw) return;
  for (const pair of decodeURIComponent(raw).split(',')) {
    const [uid, key] = pair.split(':');
    const flag = ONBOARDING_FLAGS.find((f) => f === key);
    if (uid && flag) setMockOnboardingFlag(uid, flag);
  }
}

export function onboardingFlagCookie(): string {
  const pairs = [...stateOf().flags].flatMap(([uid, set]) => [...set].map((k) => `${uid}:${k}`));
  return `${ONBOARDING_FLAG_COOKIE}=${encodeURIComponent(pairs.join(','))}; Path=/`;
}
