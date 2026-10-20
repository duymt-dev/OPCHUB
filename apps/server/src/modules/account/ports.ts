import type { MembershipFeeStatus } from '@opchub/shared';
import type { DbTx } from '@opchub/db';

/**
 * Cổng đọc phí thành viên. Account cần trạng thái phí để dựng `me` + claim JWT, nhưng không
 * được đọc bảng của domain membership-fee (nestjs-modules.md › Ranh giới). membership-fee
 * cung cấp hiện thực (`MembershipFeeCoreModule`, global) → account không phụ thuộc ngược.
 */
export interface FeeSnapshot {
  status: MembershipFeeStatus;
  validUntil: Date | null;
  amount: number;
}

export interface FeeReader {
  feeOf(userId: string): Promise<FeeSnapshot | null>;
}

export const FEE_READER = Symbol('FEE_READER');

/** AF-R03/R04: kiểm mã trước OTP, kiểm lại + gắn referral cùng transaction tạo user. */
export interface ReferralPort {
  validate(code: string, email: string): Promise<void>;
  attach(tx: DbTx, userId: string, code: string): Promise<void>;
}
export const REFERRAL_PORT = Symbol('REFERRAL_PORT');

/** Ghi phí khi tạo tài khoản — membership-fee hiện thực, chạy trong transaction của account */
export interface FeeWriter {
  /** Mở bản ghi phí `pending_payment` (BR-01); đã có thì giữ nguyên */
  openFor(tx: DbTx, userId: string): Promise<void>;
}
export const FEE_WRITER = Symbol('FEE_WRITER');

/** BR-06: nhóm chọn lúc đăng ký thành yêu cầu tham gia — community hiện thực (B20 mở rộng) */
export interface GroupJoinPort {
  /** Chỉ giữ id nhóm đang hoạt động (bỏ id lạ) */
  existingGroupIds(ids: readonly string[]): Promise<string[]>;
  /** NA-18: nhóm mở → vào ngay; nhóm cần duyệt → `pending` + báo chủ nhóm (outbox cùng tx) */
  requestJoin(tx: DbTx, userId: string, groupIds: readonly string[]): Promise<void>;
  countActiveGroups(): Promise<number>;
}
export const GROUP_JOIN_PORT = Symbol('GROUP_JOIN_PORT');

/** Số liệu hồ sơ (UP-06) — community/events/projects hiện thực dần (B20/B31/B32); mặc định 0 */
export interface ProfileStats {
  groups: number;
  events: number;
  projects: number;
}
export interface ProfileStatsReader {
  statsOf(userId: string): Promise<Partial<ProfileStats>>;
}

/** Gán nhóm từ màn Thành viên (BR-07, Q-G4a-3) — community hiện thực */
export interface GroupAssignPort {
  /**
   * GR-R01: thêm thành viên chính thức vào các nhóm với vai trò `member` / `lecturer`; người đã ở nhóm
   * với vai trò `member` được nâng lên vai trò chọn (không hạ chủ nhóm). Trả các cặp MỚI vào nhóm.
   */
  assign(
    tx: DbTx,
    userIds: readonly string[],
    groupIds: readonly string[],
    role: 'member' | 'lecturer',
  ): Promise<{ userId: string; groupId: string }[]>;
  /** Nhóm đang là thành viên của danh sách user (bảng Thành viên) */
  groupsOf(userIds: readonly string[]): Promise<Map<string, string[]>>;
}
export const GROUP_ASSIGN_PORT = Symbol('GROUP_ASSIGN_PORT');

/**
 * Hiệu ứng khi khoá / mở khoá TK (NA-16, D-15, D-55) — domain khác (community…) hiện thực rồi
 * `register` vào `LockEffectsRegistry` lúc khởi động → account không import ngược domain khác.
 * Phải IDEMPOTENT: relay outbox có thể gọi lại cùng lô.
 */
export interface LockEffects {
  onLocked(userIds: readonly string[]): Promise<void>;
  onUnlocked(userIds: readonly string[]): Promise<void>;
}

/**
 * RB-R02/R03 (D-52): email TK quản trị (`admin_users`) không được dùng cho thành viên. admin-account
 * hiện thực (`AdminAccountCoreModule`, global) → account không import ngược domain đó.
 */
export interface AdminEmailPort {
  /** Email đã thuộc một TK quản trị (kể cả đã xoá mềm — UQ toàn bảng) */
  isAdminEmail(email: string): Promise<boolean>;
  /**
   * NA-01, D-62: email + mật khẩu khớp một TK quản trị còn sống → đăng nhập Portal trả
   * `WRONG_PORTAL` (chỉ lộ khi mật khẩu đúng, BR-02)
   */
  adminPasswordMatches(email: string, password: string): Promise<boolean>;
  /** QT-02, BUG-001: TK quản trị active theo email (đặt lại mật khẩu ở Admin) */
  adminForReset(email: string): Promise<{ id: string; email: string } | null>;
  /** Đặt mật khẩu mới: bỏ cờ mật khẩu tạm, tăng version, thu hồi mọi phiên Admin */
  setAdminPassword(adminId: string, passwordHash: string, now: Date): Promise<void>;
}
export const ADMIN_EMAIL_PORT = Symbol('ADMIN_EMAIL_PORT');
