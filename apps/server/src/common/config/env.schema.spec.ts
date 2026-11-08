import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.schema';
import { createECDH } from 'node:crypto';

const ec = createECDH('prime256v1');
ec.generateKeys();
const webPush = {
  PUSH_PROVIDER: 'webpush',
  VAPID_PUBLIC_KEY: ec.getPublicKey().toString('base64url'),
  VAPID_PRIVATE_KEY: ec.getPrivateKey().toString('base64url'),
  VAPID_SUBJECT: 'mailto:test@opchub.invalid',
};

/** D-64: production bắt buộc Google SSO thật */
const googleSso = {
  ...webPush,
  SSO_PROVIDER: 'google',
  GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'google-secret-value',
};

const ok = {
  MAIL_QR_SECRET: 'q'.repeat(32),
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  BANK_WEBHOOK_SECRET: 'y'.repeat(16),
  DATA_ENC_KEY: 'z'.repeat(44),
};

describe('parseEnv', () => {
  it('SPEC11 production requires a separate mail QR secret, never prints its value', () => {
    expect(() =>
      parseEnv({
        ...ok,
        ...googleSso,
        NODE_ENV: 'production',
        UNSUBSCRIBE_SECRET: 'u'.repeat(32),
        MAIL_QR_SECRET: undefined,
      }),
    ).toThrow(/MAIL_QR_SECRET/);
    expect(() => parseEnv({ ...ok, MAIL_QR_SECRET: 'short' })).toThrow(/MAIL_QR_SECRET/);
  });
  it('D-137 production rejects fake or missing VAPID; dev unconfigured remains optional', () => {
    const prod = {
      ...ok,
      ...googleSso,
      NODE_ENV: 'production',
      UNSUBSCRIBE_SECRET: 'u'.repeat(32),
    };
    expect(() => parseEnv({ ...prod, PUSH_PROVIDER: 'fake' })).toThrow(/PUSH_PROVIDER/);
    expect(() => parseEnv({ ...prod, VAPID_PRIVATE_KEY: '' })).toThrow(/VAPID/);
    expect(() => parseEnv({ ...ok, VAPID_SUBJECT: 'http://unsafe.invalid' })).toThrow(
      /VAPID_SUBJECT/,
    );
    expect(parseEnv(prod).PUSH_PROVIDER).toBe('webpush');
    expect(parseEnv(ok).PUSH_PROVIDER).toBe('fake');
  });
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

  it('BUG-036 NA-05 UNSUBSCRIBE_SECRET bắt buộc ở production, ≥ 32 ký tự; MAIL_OTP_RESERVE mặc định 20', () => {
    expect(() => parseEnv({ ...ok, NODE_ENV: 'production' })).toThrow(/UNSUBSCRIBE_SECRET/);
    expect(() => parseEnv({ ...ok, UNSUBSCRIBE_SECRET: 'ngan' })).toThrow(/UNSUBSCRIBE_SECRET/);
    const prod = parseEnv({
      ...ok,
      ...googleSso,
      NODE_ENV: 'production',
      UNSUBSCRIBE_SECRET: 'u'.repeat(32),
    });
    expect(prod.MAIL_OTP_RESERVE).toBe(20);
    expect(parseEnv({ ...ok, MAIL_OTP_RESERVE: '5' }).MAIL_OTP_RESERVE).toBe(5);
  });

  it('BUG-001 ADMIN_URL mặc định localhost:3001', () => {
    expect(parseEnv(ok).ADMIN_URL).toBe('http://localhost:3001');
  });

  it('REQ-217 D-64 production cấm SSO fake; google cần đủ client ID/secret, lỗi không in giá trị', () => {
    const prod = { ...ok, NODE_ENV: 'production', UNSUBSCRIBE_SECRET: 'u'.repeat(32) };
    expect(() => parseEnv(prod)).toThrow(/SSO_PROVIDER/);
    expect(() => parseEnv({ ...prod, SSO_PROVIDER: 'fake' })).toThrow(/SSO_PROVIDER/);
    const noSecret = { ...prod, ...googleSso, GOOGLE_CLIENT_SECRET: '' };
    expect(() => parseEnv(noSecret)).toThrow(/GOOGLE_CLIENT_SECRET/);
    expect(() => parseEnv(noSecret)).toThrow(/^(?!.*id\.apps\.googleusercontent)/s);
    expect(parseEnv({ ...prod, ...googleSso }).SSO_PROVIDER).toBe('google');
    expect(parseEnv(ok).SSO_PROVIDER).toBe('fake');
  });

  it('D-65 DLPL_API_KEY tuỳ chọn, DLPL_BASE_URL có mặc định; dlpl thiếu key → lỗi không in giá trị', () => {
    const env = parseEnv({ ...ok, DLPL_API_KEY: '' });
    expect(env.DLPL_API_KEY).toBeUndefined();
    expect(env.DLPL_BASE_URL).toBe('https://api.dulieuphapluat.vn/v1');
    expect(parseEnv({ ...ok, TAX_LOOKUP_PROVIDER: 'chain' }).TAX_LOOKUP_PROVIDER).toBe('chain');
    expect(() => parseEnv({ ...ok, TAX_LOOKUP_PROVIDER: 'dlpl' })).toThrow(/DLPL_API_KEY/);
    expect(() => parseEnv({ ...ok, DLPL_API_KEY: 'short-key-value' })).toThrow(
      /^(?!.*short-key-value)/s,
    );
    const key = 'k'.repeat(24);
    expect(parseEnv({ ...ok, TAX_LOOKUP_PROVIDER: 'dlpl', DLPL_API_KEY: key }).DLPL_API_KEY).toBe(
      key,
    );
  });

  it('không in secret trong lỗi', () => {
    expect(() => parseEnv({ DATABASE_URL: 'secret-not-url' })).toThrow(/^(?!.*secret-not-url)/s);
  });
});
