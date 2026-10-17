import { setTimeout as sleep } from 'node:timers/promises';
import type { z } from 'zod';
import { IntegrationError } from './errors';

export interface HttpOptions {
  provider: string;
  timeoutMs?: number;
  /** Số lần thử lại cho lỗi mạng / 5xx (không retry 4xx) */
  retries?: number;
  init?: RequestInit;
  fetchImpl?: typeof fetch;
}

/**
 * GET/POST JSON có timeout 5s, retry backoff cho lỗi mạng/5xx, parse zod.
 * Dữ liệu lạ → IntegrationError(retryable=false).
 */
export async function fetchJson<S extends z.ZodType>(
  url: string,
  schema: S,
  opts: HttpOptions,
): Promise<z.infer<S>> {
  const { provider, timeoutMs = 5_000, retries = 2, init, fetchImpl = fetch } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(200 * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      lastErr = err;
      continue;
    }
    if (res.status >= 500) {
      lastErr = new Error(`HTTP ${res.status}`);
      continue;
    }
    if (!res.ok) throw new IntegrationError(provider, `HTTP ${res.status}`, false);
    const parsed = schema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) throw new IntegrationError(provider, 'Dữ liệu trả về không hợp lệ', false);
    return parsed.data;
  }
  throw new IntegrationError(provider, 'Không kết nối được', true, { cause: lastErr });
}
