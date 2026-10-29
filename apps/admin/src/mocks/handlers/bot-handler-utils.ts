import { auditBot, logSetting, type MockResult } from '@opchub/shared/mock-domains';
import type { z } from 'zod';
import { reply, userIdOf, validationError } from './domain-util';
import { adminWriteGuard } from './admin-json';

export const botWriteGuard = (request: Request) => adminWriteGuard(request, 'bots.action');
export { parseAdminBody as parseBotBody } from './admin-json';

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

/** Failed mutations never reach the audit/response commit boundary. */
export function botMutationReply<T>(
  request: Request,
  result: MockResult<T>,
  action: string,
  entity: Parameters<typeof auditBot>[1],
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
