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
});
