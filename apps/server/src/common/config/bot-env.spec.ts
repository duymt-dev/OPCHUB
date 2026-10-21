import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema';

const required = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/opchub_test',
  JWT_SECRET: 'x'.repeat(32),
  BANK_WEBHOOK_SECRET: 'y'.repeat(16),
  DATA_ENC_KEY: 'z'.repeat(44),
};

describe('REQ-208 bot adapter configuration', () => {
  it.each(['development', 'test'])(
    'REQ-208 %s defaults to a deterministic fake provider',
    (mode) => {
      expect(parseEnv({ ...required, NODE_ENV: mode }).BOT_LLM_PROVIDER).toBe('fake');
    },
  );

  it('REQ-208 rejects an unknown provider rather than silently using fake', () => {
    expect(() => parseEnv({ ...required, BOT_LLM_PROVIDER: 'unknown' })).toThrow(
      /BOT_LLM_PROVIDER/,
    );
  });

  it.each(['LLM_LOCAL_BASE', 'LLM_LOCAL_KEY', 'LLM_LOCAL_MODELS'] as const)(
    'REQ-208 real provider requires %s without exposing other credentials',
    (missing) => {
      const source = {
        ...required,
        BOT_LLM_PROVIDER: 'local',
        LLM_LOCAL_BASE: 'https://example.test/v1',
        LLM_LOCAL_KEY: 'unit-private-key',
        LLM_LOCAL_MODELS: 'unit-model',
        [missing]: undefined,
      };
      expect(() => parseEnv(source)).toThrow(new RegExp(missing));
      expect(() => parseEnv(source)).not.toThrow(/unit-private-key/);
    },
  );

  it('REQ-208 real provider has finite request/token/timeout safeguards', () => {
    const parsed = parseEnv({
      ...required,
      BOT_LLM_PROVIDER: 'local',
      LLM_LOCAL_BASE: 'https://example.test/v1',
      LLM_LOCAL_KEY: 'unit-key',
      LLM_LOCAL_MODELS: 'unit-model',
    });
    expect(parsed.LLM_LOCAL_MAX_REQUESTS).toBe(10);
    expect(parsed.LLM_LOCAL_MAX_TOKENS).toBe(128);
    expect(parsed.LLM_LOCAL_TIMEOUT_MS).toBe(60_000);
  });
});
