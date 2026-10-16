import { z } from 'zod';
import { membershipFeeSchema } from '../api';
import { MEMBERSHIP_FEE_STATUS } from '../enums';

/** SRS §13 Membership — GET /me/membership, POST /me/membership/transfer-confirm, /admin/fees */

export const bankAccountSchema = z.object({
  bankName: z.string(),
  accountNo: z.string(),
  accountName: z.string(),
  /** Tên đầy đủ hiển thị ở hộp chuyển khoản */
  bankFullName: z.string(),
});

export const myMembershipSchema = membershipFeeSchema.extend({
  memberCode: z.string(),
  bank: bankAccountSchema,
  /** BR-04: "OPCHUB [Mã TV] [SĐT]" — đối soát chỉ theo Mã TV (D-41), SĐT để tham khảo */
  transferContent: z.string(),
});
export type MyMembership = z.infer<typeof myMembershipSchema>;

export const transferConfirmResponseSchema = z.object({
  status: z.enum(MEMBERSHIP_FEE_STATUS),
  /** D-31: kích hoạt qua webhook + outbox, client chờ `membership.updated` */
  awaitingWebhook: z.boolean(),
});
export type TransferConfirmResponse = z.infer<typeof transferConfirmResponseSchema>;

export const feeRowSchema = z.object({
  userId: z.string(),
  memberCode: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  status: z.enum(MEMBERSHIP_FEE_STATUS),
  paidAt: z.string().nullable(),
  validUntil: z.string().nullable(),
  amount: z.number().int(),
});
export type FeeRow = z.infer<typeof feeRowSchema>;

export const feeQuerySchema = z.object({ status: z.enum(MEMBERSHIP_FEE_STATUS).optional() });

export const FEE_ACTIONS = ['collect', 'renew', 'remind'] as const;
export type FeeAction = (typeof FEE_ACTIONS)[number];

export const feeBulkRemindSchema = z.object({ userIds: z.array(z.string().min(1)).min(1) });
export const feeBulkRemindResponseSchema = z.object({ queued: z.number().int() });
