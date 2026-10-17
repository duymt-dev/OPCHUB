import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema';

const ok = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  BANK_WEBHOOK_SECRET: 'y'.repeat(16),
  DATA_ENC_KEY: 'z'.repeat(44),
};

describe('parseEnv', () => {
  it('báo tên biến thiếu, không in giá trị', () => {
    expect(() => parseEnv({ DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('tách CORS_ORIGINS theo dấu phẩy', () => {
    const env = parseEnv({ ...ok, CORS_ORIGINS: 'http://a, http://b' });
    expect(env.CORS_ORIGINS).toEqual(['http://a', 'http://b']);
  });

  it('giá trị mặc định cổng và redis db', () => {
    const env = parseEnv(ok);
    expect(env.API_PORT).toBe(4000);
    expect(env.REDIS_DB).toBe(1);
  });

  it('không in secret trong lỗi', () => {
    expect(() => parseEnv({ DATABASE_URL: 'secret-not-url' })).toThrow(/^(?!.*secret-not-url)/s);
  });
});
