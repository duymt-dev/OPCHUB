import type { RequesterProfile } from '../../api-domains';
import { members } from '../../fixtures';
import { feeAction } from './ops-admin';
import { notFound, ok, type MockResult } from './util';

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
      feeAction(userId, 'renew');
    }, delayMs),
  );
}

const DIAL_RE = /^\+(\d+)\s*/;

/** Thông tin điền sẵn cho form tư vấn — tập con của `GET /me` (Q-G3a-2) */
export function serviceRequester(userId: string): MockResult<RequesterProfile> {
  const m = members.find((x) => x.id === userId);
  if (!m) return notFound('Không tìm thấy hồ sơ');
  const isBiz = m.type === 'biz';
  return ok({
    fullName: m.name,
    email: m.email,
    accountType: isBiz ? 'business' : 'personal',
    phone: { country: m.cc || 'vn', number: m.phone.replace(DIAL_RE, '') },
    business: isBiz ? { taxCode: m.tax ?? '', companyName: m.company ?? m.org ?? '' } : null,
  });
}
