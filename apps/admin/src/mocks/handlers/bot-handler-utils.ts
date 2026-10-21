import { auditBot, logSetting, type MockResult } from '@opchub/shared/mock-domains';
import type { z } from 'zod';
import { reply, userIdOf, validationError } from './domain-util';
import { apiError } from './util';
import { mockAdminGuard } from './admin-guard';

/** Native JSON parser also limits command/delete bodies even when a route ignores them. */
export async function botWriteGuard(request: Request): Promise<Response | null> {
  const denied = mockAdminGuard(request, 'bots.action');
  if (denied) return denied;
  const text = await request.clone().text();
  return new TextEncoder().encode(text).byteLength > 768 * 1024
    ? apiError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn')
    : null;
}

/** Express query parser preserves repeated keys as arrays; do not silently collapse q. */
export function parseBotQuery<S extends z.ZodType>(url: string, schema: S) {
  const params = new URL(url).searchParams;
  const raw: Record<string, unknown> = Object.fromEntries(params);
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (values.length > 1) raw[key] = values;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, res: validationError(parsed.error) };
}

/** Matches native body-limits.ts; never coerce malformed JSON/null to {}. */
export async function parseBotBody<S extends z.ZodType>(request: Request, schema: S) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 768 * 1024) {
    return { ok: false as const, res: apiError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu quá lớn') };
  }
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

/** Failed mutations never reach the audit/response commit boundary. */
export function botMutationReply<T>(
  request: Request,
  result: MockResult<T>,
  action: string,
  entity: 'persona' | 'script' | 'bot_thread' | 'bot_settings',
  id: string,
  summary: string,
  status = 200,
  executionAudited = false,
) {
  if (result.ok) {
    const actor = userIdOf(request);
    if (!executionAudited) auditBot(action, entity, id, actor);
    logSetting(actor, action, id, summary, 'moderation');
  }
  return reply(result, status);
}
