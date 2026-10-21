import type { AdminPermissionKey } from '@opchub/shared';
import type { z } from 'zod';
import { mockAdminGuard } from './admin-guard';
import { validationError } from './domain-util';
import { apiError } from './util';

const tooLarge = () => apiError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn');
/** Shared native768KiB limit, after permission checks and before any mutation. */
export async function adminWriteGuard(
  request: Request,
  key: AdminPermissionKey,
): Promise<Response | null> {
  const denied = mockAdminGuard(request, key);
  if (denied) return denied;
  return new TextEncoder().encode(await request.clone().text()).byteLength > 768 * 1024
    ? tooLarge()
    : null;
}

export async function parseAdminBody<S extends z.ZodType>(request: Request, schema: S) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 768 * 1024)
    return { ok: false as const, res: tooLarge() };
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    raw = undefined;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, res: validationError(parsed.error) };
}
