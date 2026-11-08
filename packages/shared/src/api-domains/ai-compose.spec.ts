import { describe, expect, it } from 'vitest';
import { aiComposeSchema, aiModerationOutputSchema } from './ai-compose';
import { aiSettingsSchema, DEFAULT_AI_SETTINGS } from './ai-providers';

describe('D-138 trusted AI boundaries', () => {
  const body = { kind: 'project_summary', input: { title: 'Tên dự án' }, locale: 'vi' };
  it('accepts only known fields and bounds total input rather than each individual field', () => {
    expect(aiComposeSchema.safeParse(body).success).toBe(true);
    expect(aiComposeSchema.safeParse({ ...body, prompt: 'free prompt' }).success).toBe(false);
    expect(
      aiComposeSchema.safeParse({
        ...body,
        input: { title: 'a'.repeat(300), description: 'b'.repeat(1800) },
      }).success,
    ).toBe(false);
  });
  it('models are optional but supplied values are nonempty and bounded', () => {
    expect(aiSettingsSchema.parse(DEFAULT_AI_SETTINGS).models).toBeUndefined();
    expect(
      aiSettingsSchema.safeParse({ ...DEFAULT_AI_SETTINGS, models: { content: '' } }).success,
    ).toBe(false);
    expect(
      aiSettingsSchema.safeParse({ ...DEFAULT_AI_SETTINGS, models: { content: 'm'.repeat(201) } })
        .success,
    ).toBe(false);
  });
  it('untrusted moderation output needs all strict fields with bounded confidence', () => {
    expect(
      aiModerationOutputSchema.safeParse({ violate: true, label: 'scam', confidence: 0.9 }).success,
    ).toBe(true);
    expect(
      aiModerationOutputSchema.safeParse({ violate: true, label: 'scam', confidence: 1.1 }).success,
    ).toBe(false);
    expect(
      aiModerationOutputSchema.safeParse({
        violate: true,
        label: 'scam',
        confidence: 1,
        action: 'lock',
      }).success,
    ).toBe(false);
  });
});
