import { Prisma } from '@opchub/db';
import type { AiCallsFilter, AiCallsQuery } from '@opchub/shared/api-domains';

export function aiCallWhere(q: AiCallsFilter) {
  return Prisma.sql`created_at >= ${q.from}::timestamptz AND created_at <= ${q.to}::timestamptz
    ${q.purpose ? Prisma.sql`AND purpose = ${q.purpose}` : Prisma.empty}
    ${q.provider ? Prisma.sql`AND provider = ${q.provider}` : Prisma.empty}
    ${q.status ? Prisma.sql`AND status = ${q.status}` : Prisma.empty}`;
}
export function aiCallPageQuery(q: AiCallsQuery, limit = q.limit + 1) {
  const cursor = q.cursor
    ? Prisma.sql`AND (created_at, id) < (${q.cursor.at}::timestamptz, ${q.cursor.id})`
    : Prisma.empty;
  return Prisma.sql`
    SELECT c.id, to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at,
      c.purpose, c.provider, c.model, c.prompt_tokens AS "promptTokens",
      c.completion_tokens AS "completionTokens", c.cost, c.latency_ms AS "latencyMs",
      c.status, c.error_code AS "errorCode", c.actor_realm AS "actorRealm", c.actor_id AS "actorId"
    FROM (SELECT id, created_at FROM llm_calls WHERE ${aiCallWhere(q)} ${cursor}
      ORDER BY created_at DESC, id DESC LIMIT ${limit}) picked
    JOIN llm_calls c ON c.id = picked.id ORDER BY c.created_at DESC, c.id DESC`;
}
export const aiCallTotalsQuery = (q: AiCallsFilter) => Prisma.sql`
  SELECT count(*) AS calls, coalesce(sum(cost),0)::bigint AS cost,
    coalesce(sum(prompt_tokens),0)::bigint AS "promptTokens",
    coalesce(sum(completion_tokens),0)::bigint AS "completionTokens"
  FROM llm_calls WHERE ${aiCallWhere(q)}`;
