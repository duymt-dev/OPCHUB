import { describe, expect, it } from 'vitest';
import {
  AI_PROVIDER_CATALOG,
  aiKeyLast4,
  AI_PROVIDER_IDS,
  DEFAULT_AI_SETTINGS,
  aiSettingsSchema,
  aiSettingsUpdateSchema,
  aiVerifySchema,
} from './ai-providers';
const config = () => ({
  ...DEFAULT_AI_SETTINGS,
  providers: AI_PROVIDER_IDS.map((id) => ({
    id,
    enabled: false,
    baseUrl: AI_PROVIDER_CATALOG[id].baseUrl,
    model: AI_PROVIDER_CATALOG[id].models[0] ?? '',
    priceIn: 0,
    priceOut: 0,
  })),
});
describe('REQ-628 strict multi-provider contracts', () => {
  it('accepts six fixed providers and explicit defaults', () => {
    expect(aiSettingsUpdateSchema.parse(config()).providers).toHaveLength(6);
    expect(aiKeyLast4('abc')).toBe('••••');
    expect(aiKeyLast4('long-secret')).toBe('cret');
  });
  it('rejects duplicate ids, assist and unknown fields', () => {
    const c = config();
    c.providers[0] = {
      ...c.providers[1],
      id: 'openai',
      enabled: false,
      baseUrl: '',
      model: '',
      priceIn: 0,
      priceOut: 0,
    };
    expect(aiSettingsUpdateSchema.safeParse(c).success).toBe(false);
    expect(
      aiSettingsSchema.safeParse({
        ...DEFAULT_AI_SETTINGS,
        use: { ...DEFAULT_AI_SETTINGS.use, assist: '' },
      }).success,
    ).toBe(false);
    expect(aiSettingsSchema.safeParse({ ...DEFAULT_AI_SETTINGS, surprise: 1 }).success).toBe(false);
  });
  it('bounds integer VND, output tokens, temperature and warning threshold', () => {
    for (const patch of [
      { budget: -1 },
      { maxTokens: 1025 },
      { temperature: 0.15 },
      { warnPct: 0 },
    ])
      expect(aiSettingsSchema.safeParse({ ...DEFAULT_AI_SETTINGS, ...patch }).success).toBe(false);
  });
  it('permits HTTPS or loopback, never embedded URL credentials', () => {
    expect(
      aiVerifySchema.safeParse({ baseUrl: 'http://127.0.0.1:1234/v1', model: 'stub' }).success,
    ).toBe(true);
    expect(
      aiVerifySchema.safeParse({ baseUrl: 'https://user:pass@example.org', model: 'stub' }).success,
    ).toBe(false);
    expect(aiVerifySchema.safeParse({ baseUrl: 'http://example.org', model: 'stub' }).success).toBe(
      false,
    );
  });
});
