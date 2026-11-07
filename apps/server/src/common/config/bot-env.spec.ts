import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema';

const required = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/opchub_test',
  JWT_SECRET: 'x'.repeat(32),
  BANK_WEBHOOK_SECRET: 'y'.repeat(16),
  DATA_ENC_KEY: 'z'.repeat(44),
};

// Owner decision 2026-10-22: legacy flags cannot disable the Bot domain.
describe('REQ-140 no Bot environment gate', () => {
  it.each([undefined, 'false', 'true'])('ignores legacy FEATURE_BOTS=%s', (value) => {
    expect(parseEnv({ ...required, FEATURE_BOTS: value })).not.toHaveProperty('FEATURE_BOTS');
  });
});
