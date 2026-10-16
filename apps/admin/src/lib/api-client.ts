import { apiErrorSchema } from '@opchub/shared/api';
import type { ErrorCode } from '@opchub/shared';
import type { z } from 'zod';
import { useAuthStore } from './auth-store';
import { env } from './env';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly fields: { path: string; message: string }[] = [],
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions<T extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  schema: T;
  idempotencyKey?: string;
}

/** fetch bọc: gắn token + request id, parse bằng zod, ném ApiError đúng hợp đồng */
export async function api<T extends z.ZodType>(
  path: string,
  opts: RequestOptions<T>,
): Promise<z.infer<T>> {
  const headers = new Headers({ 'X-Request-Id': crypto.randomUUID() });
  const token = useAuthStore.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json');
  if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey);

  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      const e = parsed.data.error;
      throw new ApiError(e.code, res.status, e.message, e.fields, e.requestId);
    }
    throw new ApiError('INTERNAL', res.status, res.statusText);
  }
  return opts.schema.parse(json);
}
