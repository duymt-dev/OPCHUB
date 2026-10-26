import { z } from 'zod';
import { bankAccountSchema } from './membership';

/**
 * V4-610 (UP-11, AD-06, D-82): Gói Gọi vốn theo dự án.
 * - `POST /projects/:id/fundraising` → khoản chờ thanh toán (mã CK `GV` + 6 số)
 * - `GET /me/fundraisings`, `POST /me/fundraisings/:id/transfer-confirm`
 * - `POST /admin/projects/:id/fundraising/:fid/review`
 */
export const FUNDRAISING_STATUS = [
  'pending_payment',
  'pending_review',
  'active',
  'expired',
  'rejected',
] as const;
export type FundraisingStatus = (typeof FUNDRAISING_STATUS)[number];

/** Mã CK Gọi vốn (BR-04 mở rộng): `GV` + 6 số */
export const FUNDRAISING_CODE_RE = /^GV\d{6}$/;

export const fundraisingSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  /** null với khoản legacy (dự án khai báo gọi vốn trước V4) */
  code: z.string().nullable(),
  amount: z.number().int(),
  status: z.enum(FUNDRAISING_STATUS),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Fundraising = z.infer<typeof fundraisingSchema>;

/** Khoản vừa tạo / đang chờ: kèm tài khoản nhận + nội dung CK */
export const fundraisingPaymentSchema = fundraisingSchema.extend({
  bank: bankAccountSchema,
  transferContent: z.string(),
});
export type FundraisingPayment = z.infer<typeof fundraisingPaymentSchema>;

export const myFundraisingsSchema = z.object({ items: z.array(fundraisingSchema) });

export const fundraisingConfirmSchema = z.object({
  status: z.enum(FUNDRAISING_STATUS),
  /** D-31: chuyển "chờ thẩm định" khi webhook ngân hàng về */
  awaitingWebhook: z.boolean(),
});

export const FUNDRAISING_DECISIONS = ['approve', 'reject'] as const;
export type FundraisingDecision = (typeof FUNDRAISING_DECISIONS)[number];
export const fundraisingReviewSchema = z.object({
  decision: z.enum(FUNDRAISING_DECISIONS),
  note: z.string().trim().max(1000).optional(),
});

/** Admin › Dự án: khoản gần nhất không legacy (chip + nút thẩm định) */
export const adminFundraisingRefSchema = z.object({
  id: z.string(),
  status: z.enum(FUNDRAISING_STATUS),
  code: z.string().nullable(),
  endsAt: z.string().nullable(),
});
export type AdminFundraisingRef = z.infer<typeof adminFundraisingRefSchema>;
