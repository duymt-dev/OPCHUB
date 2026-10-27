import type { DbTx } from '@opchub/db';

/**
 * V4-610: đối soát CK Gói Gọi vốn (`GV` + 6 số). membership-fee nhận giao dịch ngân hàng nhưng
 * không đọc bảng `project_fundraisings` — domain project hiện thực cổng này (nestjs-modules.md).
 * Thiếu tiền / sai trạng thái → ném `AppError` (rollback, giao dịch để `unmatched` có lý do).
 */
/** D-105: Mã TV trong nội dung CK (nếu có) và thành viên tương ứng (`id` null = không tồn tại) */
export interface FundraisingPayer {
  memberCode: string;
  id: string | null;
}

export interface FundraisingPaymentPort {
  pay(
    tx: DbTx,
    input: { code: string; amount: number; transactionId: string; payer?: FundraisingPayer | null },
    now: Date,
  ): Promise<{ ownerId: string } | { reason: string }>;
}
export const FUNDRAISING_PAYMENT_PORT = Symbol('FUNDRAISING_PAYMENT_PORT');
