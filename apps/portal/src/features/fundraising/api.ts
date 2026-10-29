import {
  fundraisingConfirmSchema,
  fundraisingPaymentSchema,
  fundraisingSchema,
  myFundraisingsSchema,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** V4-610 (UP-11): Gói Gọi vốn */
export const fundraisingKeys = { mine: ['me', 'fundraisings'] as const };

const enc = encodeURIComponent;

/** Khoản chờ thanh toán của dự án (gọi lại trả cùng mã CK) */
export const startFundraising = (projectId: string) =>
  api(`/projects/${enc(projectId)}/fundraising`, {
    method: 'POST',
    schema: fundraisingPaymentSchema,
  });

export const fetchMyFundraisings = () =>
  api('/me/fundraisings', { schema: myFundraisingsSchema }).then((r) => r.items);

/** D-113 (F6): bị từ chối → bổ sung hồ sơ → gửi duyệt lại (không thu lần hai) */
export const resubmitFundraising = (id: string, key: string) =>
  api(`/me/fundraisings/${enc(id)}/resubmit`, {
    method: 'POST',
    idempotencyKey: key,
    schema: fundraisingSchema,
  });

/** D-31: chỉ ghi nhận — đổi "chờ thẩm định" khi webhook ngân hàng về */
export const confirmFundraising = (id: string, key: string) =>
  api(`/me/fundraisings/${enc(id)}/transfer-confirm`, {
    method: 'POST',
    idempotencyKey: key,
    schema: fundraisingConfirmSchema,
  });
