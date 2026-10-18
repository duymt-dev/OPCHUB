import { expect } from 'vitest';
import type { z } from 'zod';
import type { TestApp } from '../setup/test-app';

/**
 * Contract test (TIP-B61): mỗi endpoint của `plans/api-contract.md` được gọi trên app thật và
 * response 2xx parse bằng ĐÚNG zod schema FE dùng. Khai báo bằng `ep('METHOD', '/path/:p', …)`
 * — `coverage.int.spec.ts` đọc tĩnh các khai báo này để đối chiếu đủ 196 dòng.
 */
export interface CallInit {
  token?: string;
  json?: unknown;
  headers?: Record<string, string>;
  body?: string | Uint8Array<ArrayBuffer>;
}

export interface EpResult<T> {
  status: number;
  data: T;
}

/**
 * Gọi `url` (đường thật, đã thay tham số) và kiểm: status 2xx (hoặc `expectStatus`), body parse
 * bằng `schema` (`null` = không có body, vd 204). Trả dữ liệu đã parse để bước sau dùng.
 */
export async function ep<S extends z.ZodType | null>(
  t: TestApp,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  pattern: string,
  url: string,
  schema: S,
  init: CallInit = {},
  expectStatus?: number,
): Promise<EpResult<S extends z.ZodType ? z.infer<S> : null>> {
  expect(matches(pattern, url.split('?')[0] ?? url), `${url} không khớp ${pattern}`).toBe(true);
  const headers = new Headers(init.headers);
  if (method !== 'GET' && method !== 'DELETE' && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }
  const res = await t.call(url, {
    method,
    headers,
    ...(init.token ? { token: init.token } : {}),
    ...(init.json !== undefined ? { json: init.json } : {}),
    ...(init.body !== undefined ? { body: init.body } : {}),
  });
  const text = await res.text();
  const ok = expectStatus ? res.status === expectStatus : res.status >= 200 && res.status < 300;
  expect(ok, `${method} ${url} → ${res.status}: ${text.slice(0, 300)}`).toBe(true);
  if (schema === null) return { status: res.status, data: null as never };
  const parsed = schema.safeParse(text ? JSON.parse(text) : null);
  expect(
    parsed.success,
    `${method} ${pattern} schema lệch: ${parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3))}`,
  ).toBe(true);
  return { status: res.status, data: parsed.data as never };
}

/** `/a/:id/b` khớp `/a/x/b` (mỗi `:p` = một đoạn đã encode) */
export function matches(pattern: string, path: string): boolean {
  const re = new RegExp(`^${pattern.replace(/:[A-Za-z]+/g, '[^/]+')}$`);
  return re.test(path);
}
