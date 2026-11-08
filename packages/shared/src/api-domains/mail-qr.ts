import { z } from 'zod';

const id = z.string().min(1).max(128);
const stamp = { at: z.number().int().nonnegative(), exp: z.number().int().positive() };
const fee = z.strictObject({ kind: z.literal('fee'), id, anchor: z.iso.datetime() });
const fundraising = z.strictObject({ kind: z.literal('fundraising'), id });
export const mailQrTargetSchema = z.discriminatedUnion('kind', [fee, fundraising]);
export const mailQrPayloadSchema = z.discriminatedUnion('kind', [
  fee.extend(stamp),
  fundraising.extend(stamp),
]);
export const mailQrTokenSchema = z
  .string()
  .max(512)
  .regex(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
export type MailQrTarget = z.infer<typeof mailQrTargetSchema>;
export type MailQrPayload = z.infer<typeof mailQrPayloadSchema>;
