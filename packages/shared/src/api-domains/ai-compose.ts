import { z } from 'zod';
import { LOCALES } from '../fixtures/locale';

export const aiComposeSchema = z.strictObject({
  kind: z.enum(['store_description', 'project_summary', 'campaign_body']),
  input: z
    .strictObject({
      title: z.string().trim().max(300).optional(),
      description: z.string().trim().max(2000).optional(),
      category: z.string().trim().max(200).optional(),
    })
    .refine((input) => Object.values(input).join('').length <= 2000, 'Nội dung tối đa 2.000 ký tự'),
  locale: z
    .string()
    .refine((value) => LOCALES.some((locale) => locale === value), 'Ngôn ngữ không hợp lệ'),
});
export const aiComposeResponseSchema = z.strictObject({ text: z.string().max(4000) });
export const aiComposeConfigSchema = z.strictObject({ compose: z.boolean() });
export const aiModerationOutputSchema = z.strictObject({
  violate: z.boolean(),
  label: z.enum(['spam', 'scam', 'harassment', 'adult', 'other']),
  confidence: z.number().min(0).max(1),
});
export type AiCompose = z.infer<typeof aiComposeSchema>;
export const AI_COMPOSE_LIMITS = {
  store_description: 500,
  project_summary: 160,
  campaign_body: 4000,
} as const;
