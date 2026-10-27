import { vietQrPayload } from '@opchub/shared';
import type { Env } from '../config';

/**
 * Tài khoản nhận chuyển khoản (phí thành viên + Gói Gọi vốn) và chuỗi VietQR EMVCo sinh tại chỗ
 * (D-96: không gọi dịch vụ ngoài). Cùng một nguồn cấu hình ngân hàng cho mọi hộp thanh toán.
 */
export function bankTransferOf(env: Env, amount: number, content: string) {
  return {
    bank: {
      bankName: env.BANK_NAME,
      accountNo: env.BANK_ACCOUNT_NO,
      accountName: env.BANK_ACCOUNT_NAME,
      bankFullName: env.BANK_FULL_NAME,
    },
    transferContent: content,
    qr: vietQrPayload({
      bin: env.BANK_BIN,
      accountNo: env.BANK_ACCOUNT_NO,
      amount,
      purpose: content,
    }),
  };
}
