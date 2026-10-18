import type { Page, TestInfo } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../env';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/**
 * AUDIT-W1: tiện ích cho dùng thử + UAT trên server thật (MSW tắt). Không nằm trong gate:
 * chạy bằng `playwright test -c audit/playwright.audit.config.ts`.
 * Mật khẩu demo là dữ liệu công khai của prototype; DB URL đọc từ env (AUDIT_DB_URL), không in ra.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const EVIDENCE = join(ROOT, 'coding-packs/audit/W1/evidence');
export const FINDINGS = join(ROOT, 'coding-packs/audit/W1/work/findings.jsonl');
export const API = `${env.API_PROXY_URL}/v1`;
export { ADMIN_URL, PORTAL_URL };

export const USER = { email: 'an.nguyen@mediasoft.vn', pwd: 'User@2026' };
export const ADMIN = { email: 'admin@opchub.community', pwd: 'Admin@2026' };
export const UNPAID = { email: 'do.haiyen@opchub.vn', pwd: 'User@2026' };
export const OTP = process.env.AUDIT_OTP ?? '';

/** Một dòng SQL → mảng dòng, cột cách `|` (psql -At). Chỉ dùng cho opchub_dev */
export function sql(q: string): string[][] {
  const url = process.env.AUDIT_DB_URL;
  if (!url || !/\/opchub_dev(\?|$)/.test(url)) throw new Error('AUDIT_DB_URL phải trỏ opchub_dev');
  const psql = process.env.AUDIT_PSQL ?? 'psql';
  const r = spawnSync(psql, ['-d', url.split('?')[0] ?? url, '-At', '-c', q], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql lỗi: ${r.stderr.slice(0, 200)}`);
  return r.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.split('|'));
}

export async function login(page: Page, base: string, who: { email: string; pwd: string }) {
  await page.goto(`${base}/login`, { waitUntil: 'load' });
  await page.locator('input[type=email]').fill(who.email);
  await page.locator('input[type=password]').fill(who.pwd);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function apiLogin(who: { email: string; pwd: string }): Promise<string> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: who.email, password: who.pwd }),
  });
  const j = (await r.json()) as { accessToken?: string };
  if (!j.accessToken) throw new Error(`login ${who.email} → ${r.status}`);
  return j.accessToken;
}

export async function api(
  path: string,
  token: string | null,
  init: { method?: string; body?: unknown; idem?: boolean } = {},
): Promise<{ status: number; json: unknown }> {
  const r = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.idem ? { 'idempotency-key': `audit-${Date.now()}-${Math.random()}` } : {}),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const text = await r.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* không phải JSON */
  }
  return { status: r.status, json };
}

/** Chữ toast / status đang hiện */
export async function statusTexts(page: Page): Promise<string[]> {
  return page.getByRole('status').filter({ visible: true }).allInnerTexts();
}

export interface Finding {
  key: string;
  area: string;
  screen: string;
  sev: 'S1' | 'S2' | 'S3' | 'S4';
  title: string;
  expected: string;
  actual: string;
  refs?: string;
  shot?: string;
}

/** Ghi phát hiện (JSONL) + ảnh chụp bằng chứng */
export async function finding(page: Page | null, info: TestInfo, f: Finding): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  let shot: string | undefined;
  if (page) {
    shot = `${f.key}.png`;
    await page.screenshot({ path: join(EVIDENCE, shot), fullPage: false }).catch(() => undefined);
  }
  appendFileSync(FINDINGS, `${JSON.stringify({ ...f, shot, test: info.title })}\n`);
}

/** Ghi kết quả UAT / màn đã đi qua */
export function record(
  file: 'uat' | 'screens' | 'screens-recheck',
  row: Record<string, string>,
): void {
  mkdirSync(join(ROOT, 'coding-packs/audit/W1/work'), { recursive: true });
  appendFileSync(
    join(ROOT, `coding-packs/audit/W1/work/${file}.jsonl`),
    `${JSON.stringify(row)}\n`,
  );
}

/** Reset dữ liệu demo + cache (giống fixture e2e server) */
export function resetDemo(): void {
  for (const args of [
    ['--filter', '@opchub/db', 'seed:demo'],
    ['--filter', '@opchub/server', 'flush:dev-cache'],
  ]) {
    const r = spawnSync('pnpm', args, {
      cwd: ROOT,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
    if (r.status !== 0) throw new Error(`pnpm ${args.join(' ')} thất bại`);
  }
}

/** Ảnh PNG hợp lệ cỡ ~n byte (header PNG 1×1 + chunk phụ) để thử upload biên */
export function pngOfSize(n: number): Buffer {
  const base = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const pad = Math.max(0, n - base.length - 12);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(pad);
  const chunk = Buffer.concat([len, Buffer.from('teXt'), Buffer.alloc(pad, 0x41), Buffer.alloc(4)]);
  // chèn chunk trước IEND (12 byte cuối)
  return Buffer.concat([
    base.subarray(0, base.length - 12),
    chunk,
    base.subarray(base.length - 12),
  ]);
}
