/** @deprecated ADR0009: retained for legacy typed imports; runtime/API use ai-providers. */
import { z } from 'zod';
import { llmLocalConfigSchema } from '../integrations/llm';

const fields = {
  baseUrl: z.union([z.literal(''), llmLocalConfigSchema.shape.baseUrl]),
  model: z.string().trim().max(200),
  maxTokens: llmLocalConfigSchema.shape.maxTokens,
  timeoutMs: llmLocalConfigSchema.shape.timeoutMs,
  enabled: z.boolean(),
};

/** ADR-0008: blank/omitted replacement retains the stored key; never round-trip it. */
export const llmConfigUpdateSchema = z
  .strictObject({
    ...fields,
    key: z
      .union([z.literal(''), z.string().trim().min(8).max(4096)])
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (!value.baseUrl)
      ctx.addIssue({ code: 'custom', path: ['baseUrl'], message: 'Endpoint AI là bắt buộc' });
    if (!value.model)
      ctx.addIssue({ code: 'custom', path: ['model'], message: 'Model AI là bắt buộc' });
  });

/** Connection verification does not save a draft and requires complete connection details. */
export const llmConfigVerifySchema = llmConfigUpdateSchema.superRefine((value, ctx) => {
  if (!value.baseUrl)
    ctx.addIssue({ code: 'custom', path: ['baseUrl'], message: 'Endpoint AI là bắt buộc' });
  if (!value.model)
    ctx.addIssue({ code: 'custom', path: ['model'], message: 'Model AI là bắt buộc' });
});

export const llmConfigSchema = z.strictObject({
  ...fields,
  hasKey: z.boolean(),
  keyLast4: z.string().length(4).nullable(),
  configured: z.boolean(),
  updatedAt: z.iso.datetime().nullable(),
});

export const llmConfigVerifyResultSchema = z.strictObject({
  ok: z.boolean(),
  message: z.string(),
});

export type LlmConfig = z.infer<typeof llmConfigSchema>;
export type LlmConfigUpdate = z.infer<typeof llmConfigUpdateSchema>;
export type LlmConfigVerifyResult = z.infer<typeof llmConfigVerifyResultSchema>;

export const EMPTY_LLM_CONFIG: LlmConfig = {
  baseUrl: '',
  model: '',
  maxTokens: 128,
  timeoutMs: 60_000,
  enabled: false,
  hasKey: false,
  keyLast4: null,
  configured: false,
  updatedAt: null,
};
