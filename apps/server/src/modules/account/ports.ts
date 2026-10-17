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
  requestJoin(tx: DbTx, userId: string, groupIds: readonly string[]): Promise<void>;
  countActiveGroups(): Promise<number>;
}
export const GROUP_JOIN_PORT = Symbol('GROUP_JOIN_PORT');
