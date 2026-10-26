import type { DbTx } from '@opchub/db';

/**
 * V4-610: đối soát CK Gói Gọi vốn (`GV` + 6 số). membership-fee nhận giao dịch ngân hàng nhưng
 * không đọc bảng `project_fundraisings` — domain project hiện thực cổng này (nestjs-modules.md).
 * Thiếu tiền / sai trạng thái → ném `AppError` (rollback, giao dịch để `unmatched` có lý do).
 */
export interface FundraisingPaymentPort {
  pay(
    tx: DbTx,
    input: { code: string; amount: number; transactionId: string },
    now: Date,
  ): Promise<{ ownerId: string } | { reason: string }>;
}
export const FUNDRAISING_PAYMENT_PORT = Symbol('FUNDRAISING_PAYMENT_PORT');
