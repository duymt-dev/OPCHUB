import { z } from 'zod';

export const bankSettingsPatchSchema = z.object({ autoActivate: z.boolean() }).strict();
export const bankCountsSchema = z.object({
  matched: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
});
export const bankSettingsSchema = bankSettingsPatchSchema.extend({
  provider: z.enum(['fake', 'sepay']),
  webhookUrl: z.url(),
  keyHint: z.string().max(4),
  bankName: z.string(),
  accountNo: z.string(),
  accountName: z.string(),
  canSimulate: z.boolean(),
  counts: bankCountsSchema,
});
export const bankTxnStatusSchema = z.enum(['matched', 'manual', 'unmatched', 'short']);
export const bankTxnRowSchema = z.object({
  id: z.string().min(1),
  receivedAt: z.iso.datetime(),
  amount: z.number().int().positive(),
  content: z.string(),
  memberName: z.string().nullable(),
  status: bankTxnStatusSchema,
  shortRecorded: z.boolean(),
  shortNote: z.string().nullable(),
  reason: z.string().nullable(),
  matchedHint: z.string().nullable(),
  fundraisingHint: z.string().nullable(),
  suggestedName: z.string().nullable(),
});
export const bankCursorSchema = z
  .object({ receivedAt: z.iso.datetime(), id: z.string().min(1) })
  .strict();
export const bankTxnQuerySchema = z.object({
  cursor: z
    .string()
    .transform((s, ctx) => {
      try {
        return bankCursorSchema.parse(JSON.parse(s));
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Cursor không hợp lệ' });
        return z.NEVER;
      }
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const bankTxnPageSchema = z.object({
  items: z.array(bankTxnRowSchema),
  nextCursor: z.string().nullable(),
});
export const bankKeyRotateResultSchema = z
  .object({ key: z.string().min(32), hint: z.string().length(4) })
  .strict();
export const bankSealedKeySchema = z
  .object({ encrypted: z.string().min(1), hint: z.string().max(4) })
  .strict();
export const bankShortSchema = z.object({ note: z.string().trim().min(1).max(500) }).strict();
export const bankTestResultSchema = z.object({
  provider: z.enum(['fake', 'sepay']),
  received: z.number().int().nonnegative(),
});
export const bankSimulateResultSchema = z.object({
  id: z.string(),
  amount: z.number().int().positive(),
  content: z.string(),
  autoActivated: z.boolean(),
  memberName: z.string(),
  plan: z.enum(['personal', 'business']),
});
export type BankSettings = z.infer<typeof bankSettingsSchema>;
export type BankTxnRow = z.infer<typeof bankTxnRowSchema>;
export type BankTxnQuery = z.infer<typeof bankTxnQuerySchema>;
export type BankSettingsPatch = z.infer<typeof bankSettingsPatchSchema>;
export type BankSimulateResult = z.infer<typeof bankSimulateResultSchema>;
