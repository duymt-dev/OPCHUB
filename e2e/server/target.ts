/**
 * Import ĐẦU TIÊN trong playwright.server.config.ts: đặt E2E_TARGET trước khi `env.ts` parse,
 * để `urls.ts` (và worker Playwright kế thừa env) trỏ vào app chế độ server.
 */
// eslint-disable-next-line no-restricted-syntax -- cờ chạy e2e, đọc lại qua env.ts (zod)
process.env.E2E_TARGET = 'server';
