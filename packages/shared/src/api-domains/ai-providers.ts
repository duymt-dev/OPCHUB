import { z } from 'zod';
import { llmLocalConfigSchema } from '../integrations/llm';
import { AI_PROVIDER_CATALOG, AI_PROVIDER_IDS, AI_PURPOSES } from './ai-provider-catalog';
export { AI_PROVIDER_CATALOG, AI_PROVIDER_IDS, AI_PURPOSES };
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];
export type AiPurpose = (typeof AI_PURPOSES)[number];
export const aiProviderIdSchema = z.enum(AI_PROVIDER_IDS);
const choice = z.union([z.literal(''), aiProviderIdSchema]);
const providerFields = {
  id: aiProviderIdSchema,
  enabled: z.boolean(),
  baseUrl: z.union([z.literal(''), llmLocalConfigSchema.shape.baseUrl]),
  model: z.string().trim().max(200),
  priceIn: z.number().int().min(0).max(1e9),
  priceOut: z.number().int().min(0).max(1e9),
};
export const aiSettingsSchema = z.strictObject({
  use: z.strictObject({ bot: choice, script: choice, content: choice, mod: choice }),
  fallback: choice,
  temperature: z.number().min(0).max(1).multipleOf(0.1),
  maxTokens: llmLocalConfigSchema.shape.maxTokens,
  timeoutMs: llmLocalConfigSchema.shape.timeoutMs,
  budget: z.number().int().min(0).max(1e12),
  warnPct: z.number().int().min(1).max(100),
  log: z.boolean(),
  pii: z.boolean(),
});
const key = z.string().trim().max(500).optional();
export const aiProviderUpdateSchema = z.strictObject({ ...providerFields, key });
export const aiSettingsUpdateSchema = aiSettingsSchema.extend({
  providers: z
    .array(aiProviderUpdateSchema)
    .length(6)
    .refine((rows) => new Set(rows.map((r) => r.id)).size === 6, 'Nhà cung cấp không được trùng'),
});
export const aiProviderResponseSchema = z.strictObject({
  ...providerFields,
  hasKey: z.boolean(),
  keyLast4: z.string().length(4).nullable(),
  status: z.enum(['none', 'ok', 'err']),
  checkedAt: z.iso.datetime().nullable(),
});
export const aiSettingsResponseSchema = aiSettingsSchema.extend({
  providers: z.array(aiProviderResponseSchema).length(6),
  spend: z.strictObject({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    cost: z.number().int().nonnegative(),
    pct: z.number().int().min(0).max(100),
  }),
});
export const aiVerifySchema = z.strictObject({
  key,
  baseUrl: llmLocalConfigSchema.shape.baseUrl,
  model: z.string().trim().min(1).max(200),
});
export const aiVerifyResultSchema = z.strictObject({ ok: z.boolean(), message: z.string() });
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiSettingsUpdate = z.infer<typeof aiSettingsUpdateSchema>;
export type AiSettingsResponse = z.infer<typeof aiSettingsResponseSchema>;
export type AiVerify = z.infer<typeof aiVerifySchema>;
export type AiProviderUpdate = z.infer<typeof aiProviderUpdateSchema>;
/** Never disclose an entire short credential through the last-four convenience label. */
export function aiKeyLast4(key: string | null): string | null {
  return key ? (key.length > 4 ? key.slice(-4) : '••••') : null;
}
export const DEFAULT_AI_SETTINGS: AiSettings = {
  use: { bot: 'claude', script: 'claude', content: 'claude', mod: 'usgate' },
  fallback: 'usgate',
  temperature: 0.7,
  maxTokens: 1024,
  timeoutMs: 60000,
  budget: 5000000,
  warnPct: 80,
  log: true,
  pii: true,
};
