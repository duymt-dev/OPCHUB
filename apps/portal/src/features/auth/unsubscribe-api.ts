import { unsubscribeInfoSchema, unsubscribeResultSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** BUG-036: trang công khai huỷ nhận thư chiến dịch (token HMAC trong link chân thư) */
export const fetchUnsubscribeInfo = (token: string) =>
  api(`/public/unsubscribe?token=${encodeURIComponent(token)}`, { schema: unsubscribeInfoSchema });

export const confirmUnsubscribe = (token: string) =>
  api('/public/unsubscribe', { method: 'POST', body: { token }, schema: unsubscribeResultSchema });
