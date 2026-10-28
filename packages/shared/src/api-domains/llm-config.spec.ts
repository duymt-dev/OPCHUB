import { describe, expect, it } from 'vitest';
import {
  EMPTY_LLM_CONFIG,
  llmConfigSchema,
  llmConfigUpdateSchema,
  llmConfigVerifySchema,
} from './llm-config';

const draft = {
  baseUrl: 'http://127.0.0.1:4999/v1',
  model: 'stub-model',
  enabled: true,
  maxTokens: 128,
  timeoutMs: 1000,
};

describe('REQ-607 D-99 encrypted AI configuration contract', () => {
  it('represents unconfigured state without a provider/key fallback', () => {
    expect(llmConfigSchema.parse(EMPTY_LLM_CONFIG)).toEqual(EMPTY_LLM_CONFIG);
  });
  it('accepts explicit loopback HTTP stub and HTTPS providers', () => {
    expect(llmConfigUpdateSchema.parse(draft)).toEqual(draft);
    expect(
      llmConfigUpdateSchema.parse({ ...draft, baseUrl: 'https://ai.example/v1' }).baseUrl,
    ).toBe('https://ai.example/v1');
  });
  it.each([
    'http://ai.example/v1',
    'file:///secret',
    'https://user:password@ai.example/v1',
    'https://ai.example/v1?key=private',
    'https://ai.example/v1#private',
  ])('rejects unsafe connection URL %s', (baseUrl) => {
    expect(llmConfigUpdateSchema.safeParse({ ...draft, baseUrl }).success).toBe(false);
  });
  it('blank replacement preserves key and short keys cannot expose their entirety as last4', () => {
    expect(llmConfigUpdateSchema.parse({ ...draft, key: '' }).key).toBeUndefined();
    expect(llmConfigUpdateSchema.safeParse({ ...draft, key: '1234' }).success).toBe(false);
    expect(llmConfigUpdateSchema.parse({ ...draft, key: 'local-test-key' }).key).toBe(
      'local-test-key',
    );
  });
  it.each([
    { maxTokens: 0 },
    { maxTokens: 1025 },
    { maxTokens: 16.5 },
    { timeoutMs: 999 },
    { timeoutMs: 120001 },
  ])('bounds adapter budgets %j', (change) => {
    expect(llmConfigUpdateSchema.safeParse({ ...draft, ...change }).success).toBe(false);
  });
  it('requires both model and endpoint when enabling or verifying', () => {
    const blank = { ...draft, model: '', baseUrl: '' };
    expect(llmConfigUpdateSchema.safeParse(blank).success).toBe(false);
    expect(llmConfigUpdateSchema.safeParse({ ...blank, enabled: false }).success).toBe(true);
    expect(llmConfigVerifySchema.safeParse({ ...blank, enabled: false }).success).toBe(false);
  });
  it('does not permit secret fields in response or unknown request fields', () => {
    expect(llmConfigSchema.safeParse({ ...EMPTY_LLM_CONFIG, key: 'local-test-key' }).success).toBe(
      false,
    );
    expect(llmConfigUpdateSchema.safeParse({ ...draft, keyEnc: 'encrypted' }).success).toBe(false);
  });
});
