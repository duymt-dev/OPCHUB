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

  it('biến để trống như .env.example → dùng mặc định / bỏ qua', () => {
    const env = parseEnv({ ...ok, OTP_FIXED_CODE: '', SMTP_PORT: '', BANK_NAME: '' });
    expect(env.OTP_FIXED_CODE).toBeUndefined();
    expect(env.SMTP_PORT).toBeUndefined();
    expect(env.BANK_NAME).toBe('Vietcombank');
  });

  it('OTP_FIXED_CODE bị cấm ở production (Q-B11-2)', () => {
    expect(() => parseEnv({ ...ok, NODE_ENV: 'production', OTP_FIXED_CODE: '123456' })).toThrow(
      /OTP_FIXED_CODE/,
    );
    expect(parseEnv({ ...ok, NODE_ENV: 'test', OTP_FIXED_CODE: '123456' }).OTP_FIXED_CODE).toBe(
      '123456',
    );
  });

  it('TD-035 FAKE_MAIL_DIR bị cấm ở production', () => {
    expect(() => parseEnv({ ...ok, NODE_ENV: 'production', FAKE_MAIL_DIR: '/tmp/mail' })).toThrow(
      /FAKE_MAIL_DIR/,
    );
    expect(parseEnv({ ...ok, NODE_ENV: 'test', FAKE_MAIL_DIR: '/tmp/mail' }).FAKE_MAIL_DIR).toBe(
      '/tmp/mail',
    );
  });

  it('BUG-001 ADMIN_URL mặc định localhost:3001', () => {
    expect(parseEnv(ok).ADMIN_URL).toBe('http://localhost:3001');
  });

  it('không in secret trong lỗi', () => {
    expect(() => parseEnv({ DATABASE_URL: 'secret-not-url' })).toThrow(/^(?!.*secret-not-url)/s);
  });
});
