import { z } from 'zod';

/** A real provider is opt-in. Never accept credentials embedded in a URL. */
export const llmLocalConfigSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      return (
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        (url.protocol === 'https:' || (url.protocol === 'http:' && loopback))
      );
    }),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).max(200),
  maxRequests: z.number().int().min(1).max(100).default(10),
  maxTokens: z.number().int().min(16).max(1024).default(128),
  timeoutMs: z.number().int().min(1000).max(120_000).default(60_000),
});

export const llmCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().trim().min(1).max(4000) }),
        finish_reason: z.literal('stop'),
      }),
    )
    .min(1)
    .max(8),
});
