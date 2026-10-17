import type { MembershipFeeStatus } from '@opchub/shared';

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
