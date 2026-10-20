import { feeAction } from './ops-admin';

/**
 * D-31: "Tôi đã chuyển khoản" chỉ ghi nhận; tài khoản kích hoạt khi webhook ngân hàng về
 * (backend: `POST /webhooks/bank` → outbox → `membership.updated`). MSW giả lập webhook trễ.
 */

/** Độ trễ webhook giả lập — bằng thời gian chờ đối soát của prototype */
export const MOCK_WEBHOOK_DELAY_MS = 2200;

const pending = new Map<string, ReturnType<typeof setTimeout>>();

/** Webhook giả: khớp Mã TV + số tiền → gia hạn 12 tháng (BR-05); gọi lại thì đặt lại hẹn giờ */
export function scheduleBankWebhook(userId: string, delayMs = MOCK_WEBHOOK_DELAY_MS): void {
  clearTimeout(pending.get(userId));
  pending.set(
    userId,
    setTimeout(() => {
      pending.delete(userId);
      feeAction(userId, 'renew', Date.now());
    }, delayMs),
  );
}
