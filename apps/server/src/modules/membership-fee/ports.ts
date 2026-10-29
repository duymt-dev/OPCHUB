import type { DbTx } from '@opchub/db';
import type { PendingFundraising } from '@opchub/shared/api-domains';

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
  /**
   * D-113 (F3): kế toán khớp tay giao dịch vào khoản đang chờ thanh toán → chờ thẩm định (không kiểm
   * số tiền, như khớp tay phí); trả `null` khi khoản không còn chờ thanh toán. Audit + outbox ở trong.
   */
  payManual(
    tx: DbTx,
    input: {
      fundraisingId: string;
      transactionId: string;
      amount: number;
      actorId: string;
      ip: string | null;
      reason: string;
    },
    now: Date,
  ): Promise<{ ownerId: string } | null>;
  /** Khoản chờ thanh toán (lọc theo mã GV / tên dự án / Mã TV), tối đa 20 */
  pending(q: string): Promise<PendingFundraising[]>;
}
export const FUNDRAISING_PAYMENT_PORT = Symbol('FUNDRAISING_PAYMENT_PORT');
