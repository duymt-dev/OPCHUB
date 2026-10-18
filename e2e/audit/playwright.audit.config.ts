import '../server/target';
import { defineConfig } from '@playwright/test';

/**
 * AUDIT-W1 — dùng thử theo đặc tả + UAT-01→31 trên server thật (MSW tắt). KHÔNG thuộc gate
 * mặc định. Cần sẵn: api/socket/worker (:4000/:4001), Portal :3200 + Admin :3201 build server.
 * Env: AUDIT_DB_URL (opchub_dev), AUDIT_PSQL, AUDIT_OTP (OTP cố định dev).
 * Kết quả: coding-packs/audit/W1/work/*.jsonl + evidence/*.png. Test "đỏ" = phát hiện, không
 * phải lỗi của bộ audit: mỗi kiểm ghi finding rồi tiếp tục (expect.soft).
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.audit\.ts/,
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
  },
});
