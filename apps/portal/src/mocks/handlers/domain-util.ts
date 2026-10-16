import type { MockResult } from '@opchub/shared/mock-domains';
import { HttpResponse } from 'msw/http';
import type { z } from 'zod';
import { apiError } from './util';

/** Helper MSW cho handler theo domain: parse zod, map MockResult → HTTP, lấy user từ token */

/** Token mock có dạng `mock.<userId>` (handler auth); thiếu token → TK demo m1 cho dev */
export function userIdOf(request: Request): string {
  const auth = request.headers.get('Authorization') ?? '';
  const m = /^Bearer mock\.(.+)$/.exec(auth);
  return m?.[1] ?? 'm1';
}

export function validationError(error: z.ZodError) {
  return HttpResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        fields: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        requestId: crypto.randomUUID(),
      },
    },
    { status: 400 },
  );
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.output<T> } | { ok: false; res: Response }> {
  const json: unknown = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(json ?? {});
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, res: validationError(parsed.error) };
}

export function parseQuery<T extends z.ZodType>(
  url: string,
  schema: T,
): { ok: true; data: z.output<T> } | { ok: false; res: Response } {
  const raw = Object.fromEntries(new URL(url).searchParams);
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, res: validationError(parsed.error) };
}

export function reply<T>(result: MockResult<T>, status = 200) {
  return result.ok
    ? HttpResponse.json(result.data as object, { status })
    : apiError(result.status, result.code, result.message);
}

export const param = (p: Record<string, string | readonly string[] | undefined>, key: string) =>
  String(p[key] ?? '');
