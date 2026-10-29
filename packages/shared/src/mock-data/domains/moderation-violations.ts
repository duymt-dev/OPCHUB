import {
  AUTO_LOCK_FROM,
  type LockDays,
  MODERATION_DEFAULTS,
  type ModerationSettings,
  type Report,
  VIOLATION_LOCK_REASON,
  VIOLATION_WINDOW_DAYS,
} from '../../api-domains';
import { members } from '../../fixtures';
import { enqueueMockModerationWarning } from './moderation-warning-jobs';
import { type MockLock, mockLocks, setMockMemberStatus } from './member-lifecycle';
import { mockReportSource } from './report-context';
import { logSetting } from './settings-log';
import { mockDb } from './store';
import type { MockDb } from './store-types';
import { iso } from './util';

/**
 * Chỉ cho MSW/e2e — Kiểm duyệt §26.6 (V4-612, D-77, D-83) như server: tin bị báo cáo / trúng từ
 * khoá ẩn ngay + một vi phạm / tin; lần 1 cảnh báo, từ lần 2 (90 ngày) khoá tự động N ngày; Khôi
 * phục tin bỏ tính và mở khoá tự động khi < 2; hết hạn khoá tự mở (kiểm khi đọc / đăng nhập).
 */
interface Violation {
  userId: string;
  messageId: string;
  at: number;
  revoked: boolean;
}
interface State {
  violations: Map<string, Violation>;
  settings: ModerationSettings;
  restored: Set<string>;
}

const DAY_MS = 86_400_000;
const states = new WeakMap<MockDb, State>();

/** Ca seed (prototype `reports`) không qua `rememberMockReportSource` → tra theo tên thành viên */
function sourceOf(reportId: string): { userId: string | null; messageId: string } | null {
  const src = mockReportSource(reportId);
  if (src) return { userId: src.userId, messageId: src.messageId };
  const db = mockDb();
  const messageId = db.reportMessageIds.get(reportId);
  const r = db.reports.find((x) => x.id === reportId);
  if (!messageId || !r) return null;
  return {
    userId:
      members.find((m) => m.name === r.senderName)?.id ??
      db.fees.find((f) => f.fullName === r.senderName)?.userId ??
      null,
    messageId,
  };
}

/**
 * Seed như prototype: mỗi ca seed của thành viên là một vi phạm ("Vi phạm lần 1"); m4 (Ngô Thành
 * Đạt) đã khoá thủ công không thời hạn (`locked:{m4:1}`).
 */
function seedState(db: MockDb): State {
  const violations = new Map<string, Violation>();
  for (const r of db.reports) {
    const messageId = db.reportMessageIds.get(r.id);
    const userId = members.find((m) => m.name === r.senderName)?.id;
    if (messageId && userId)
      violations.set(r.id, { userId, messageId, at: Date.parse(r.createdAt), revoked: false });
  }
  return {
    violations,
    settings: { ...MODERATION_DEFAULTS },
    restored: new Set(),
  };
}

function state(): State {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = seedState(db);
    states.set(db, s);
  }
  return s;
}

const findMessage = (id: string) => [...mockDb().messages.values()].flat().find((m) => m.id === id);

export function mockViolationCount(userId: string, now = Date.now()): number {
  const from = now - VIOLATION_WINDOW_DAYS * DAY_MS;
  return [...state().violations.values()].filter(
    (v) => v.userId === userId && !v.revoked && v.at > from,
  ).length;
}

/** Hết hạn → mở (job 5 phút / đăng nhập ở server); gọi trước khi đọc trạng thái */
export function sweepMockExpiredLocks(now = Date.now()): number {
  let n = 0;
  for (const [userId, lock] of [...mockLocks()]) {
    if (lock.until === null || lock.until > now) continue;
    if (setMockMemberStatus(userId, 'active', 'system', null).ok) n++;
  }
  return n;
}

export const mockLockedUntil = (userId: string): number | null =>
  mockLocks().get(userId)?.until ?? null;

/** Khoá có hạn (thủ công / tự động) — `days` null = không thời hạn */
export function lockMockMember(
  userId: string,
  kind: MockLock['kind'],
  days: number | null,
  actorId: string,
  reason: string | null,
  now = Date.now(),
): boolean {
  const until = days ? now + days * DAY_MS : null;
  return setMockMemberStatus(userId, 'locked', actorId, reason, { until, kind }).ok;
}

/** Báo cáo / từ khoá: ẩn tin + tính vi phạm (một tin tối đa một vi phạm) */
export function hideAndCountMock(reportId: string, now = Date.now()): void {
  const src = sourceOf(reportId);
  const m = src ? findMessage(src.messageId) : undefined;
  if (!src || !m) return;
  if (!m.hiddenAt) m.hiddenAt = iso(now);
  const s = state();
  const counted = [...s.violations.values()].some((v) => v.messageId === m.id && !v.revoked);
  if (!src.userId || counted || s.violations.has(reportId)) return;
  s.violations.set(reportId, { userId: src.userId, messageId: m.id, at: now, revoked: false });
  if (mockViolationCount(src.userId, now) >= AUTO_LOCK_FROM) {
    if (mockDb().userStatus.get(src.userId) !== 'locked')
      lockMockMember(
        src.userId,
        'auto',
        s.settings.autoLockDays,
        'system',
        VIOLATION_LOCK_REASON,
        now,
      );
  } else enqueueMockModerationWarning(reportId);
}

/** Tin đã được Admin khôi phục (job từ khoá chạy lại không ẩn lại) */
export const restoredMock = (messageId: string) =>
  [...state().violations.values()].some((v) => v.messageId === messageId && v.revoked) ||
  state().restored.has(messageId);

/** Khôi phục tin: hiện lại, vi phạm của tin không tính; < 2 và khoá tự động → mở; trả true nếu mở */
export function restoreMock(reportId: string, actorId: string, now = Date.now()): boolean {
  const src = sourceOf(reportId);
  if (!src) return false;
  const m = findMessage(src.messageId);
  if (m) delete m.hiddenAt;
  state().restored.add(src.messageId);
  for (const v of state().violations.values()) if (v.messageId === src.messageId) v.revoked = true;
  const lock = src.userId ? mockLocks().get(src.userId) : undefined;
  if (!src.userId || lock?.kind !== 'auto' || mockViolationCount(src.userId, now) >= AUTO_LOCK_FROM)
    return false;
  return setMockMemberStatus(src.userId, 'active', actorId, null).ok;
}

/** Bổ sung trường V4-612 cho thẻ Admin */
export function withMockViolations(r: Report, now = Date.now()): Report {
  const userId = sourceOf(r.id)?.userId ?? null;
  if (!userId)
    return { ...r, violations: 0, senderLocked: false, lockedUntil: null, canLock: false };
  const locked = mockDb().userStatus.get(userId) === 'locked';
  const until = mockLockedUntil(userId);
  return {
    ...r,
    violations: mockViolationCount(userId, now),
    senderLocked: locked,
    lockedUntil: locked && until ? iso(until) : null,
    canLock: !locked,
  };
}

export const mockModerationSettings = (): ModerationSettings => state().settings;
export const mockViolationState = () => state();

export function saveMockModerationSettings(actorId: string, next: { autoLockDays: LockDays }) {
  state().settings = { ...next };
  logSetting(
    actorId,
    'moderation.settings.update',
    'moderation',
    `Thời gian khóa khi vi phạm: ${next.autoLockDays} ngày`,
    'moderation',
  );
  return state().settings;
}
