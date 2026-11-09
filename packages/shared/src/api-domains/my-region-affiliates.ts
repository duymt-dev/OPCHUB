import { z } from 'zod';

const amount = z.number().int().nonnegative();
export const myRegionAffiliateSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  province: z.string().optional(),
  customers: amount,
  revenue: amount,
  share: amount,
});
export const myRegionAffiliateCursorSchema = z
  .object({
    share: z
      .string()
      .regex(/^\d{1,19}$/)
      .refine((value) => /^\d{1,19}$/.test(value) && BigInt(value) <= 9_223_372_036_854_775_807n),
    name: z.string().max(300),
    id: z.string().min(1).max(200),
  })
  .strict();
export type MyRegionAffiliateCursor = z.infer<typeof myRegionAffiliateCursorSchema>;
export function encodeMyRegionAffiliateCursor(cursor: MyRegionAffiliateCursor) {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export const myRegionAffiliateQuerySchema = z
  .object({
    cursor: z
      .string()
      .max(1500)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((raw, ctx) => {
        try {
          const bytes = Uint8Array.from(atob(raw.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
            c.charCodeAt(0),
          );
          return myRegionAffiliateCursorSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Con trỏ không hợp lệ' });
          return z.NEVER;
        }
      })
      .optional(),
    limit: z.coerce.number().int().min(1).max(50).default(50),
  })
  .strict();
export type MyRegionAffiliateQuery = z.infer<typeof myRegionAffiliateQuerySchema>;
export const myRegionAffiliatePageSchema = z.object({
  items: z.array(myRegionAffiliateSchema).max(50),
  more: amount,
  nextCursor: z.string().nullable(),
});
export type MyRegionAffiliatePage = z.infer<typeof myRegionAffiliatePageSchema>;
