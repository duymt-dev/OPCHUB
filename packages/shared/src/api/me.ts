import { z } from 'zod';
import { ACCOUNT_TYPE, MEMBERSHIP_FEE_STATUS, USER_STATUS } from '../enums';

export const membershipFeeSchema = z.object({
  status: z.enum(MEMBERSHIP_FEE_STATUS),
  validUntil: z.string().nullable(),
  transferRef: z.string(),
  amount: z.number().int(),
});
export type MembershipFee = z.infer<typeof membershipFeeSchema>;

export const meSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  accountType: z.enum(ACCOUNT_TYPE),
  systemRole: z.enum(['super_admin', 'admin', 'moderator', 'member']),
  status: z.enum(USER_STATUS),
  avatarUrl: z.string().nullable(),
  membershipFee: membershipFeeSchema.nullable(),
});
export type Me = z.infer<typeof meSchema>;
