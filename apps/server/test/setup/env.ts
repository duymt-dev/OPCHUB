/**
 * Setup integration test: luôn chạy trên DB test + Redis db 2 (không bao giờ opchub_dev / db 1).
 * Đọc TEST_DATABASE_URL từ `.env` của app (gitignored) hoặc env CI.
 */
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) loadEnvFile('.env');

/* eslint-disable no-restricted-syntax -- setup test ghi env trước khi loadEnv() parse bằng zod */
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl?.includes('_test')) {
  throw new Error('Thiếu TEST_DATABASE_URL trỏ tới DB test');
}
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: testUrl,
  REDIS_DB: '2',
  LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? 'silent',
  CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
  // Q-B11-2: OTP cố định để test đọc được (OtpService chỉ dùng khi không phải production)
  OTP_FIXED_CODE: '123456',
  MAIL_PROVIDER: 'fake',
  TAX_LOOKUP_PROVIDER: 'fake',
});
/* eslint-enable no-restricted-syntax */
