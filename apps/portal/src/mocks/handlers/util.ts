import type { ErrorCode } from '@opchub/shared';
import { HttpResponse } from 'msw/http';

export const API = '/v1';

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  fields?: { path: string; message: string }[],
) {
  return HttpResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}), requestId: crypto.randomUUID() } },
    { status },
  );
}

export function pageParams(url: string, defaultSize: number) {
  const q = new URL(url).searchParams;
  const page = Math.max(1, Number(q.get('page') ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(q.get('size') ?? defaultSize) || defaultSize));
  return { q, page, size };
}
