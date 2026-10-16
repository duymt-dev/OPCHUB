import { myMembershipSchema, transferConfirmResponseSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

/** SRS §13 Membership — GET /me/membership, POST /me/membership/transfer-confirm */

export const membershipKeys = {
  mine: ['me', 'membership'] as const,
};

export const fetchMembership = () => api('/me/membership', { schema: myMembershipSchema });

/** D-31: chỉ ghi nhận; kích hoạt khi webhook ngân hàng về (`membership.updated`) */
export const confirmTransfer = () =>
  api('/me/membership/transfer-confirm', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    schema: transferConfirmResponseSchema,
  });
