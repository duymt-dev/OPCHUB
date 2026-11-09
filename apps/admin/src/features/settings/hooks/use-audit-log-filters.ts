'use client';

import { z } from 'zod';
import {
  AUDIT_TAGS,
  auditLogFiltersSchema,
  type AuditLogFilters,
} from '@opchub/shared/api-domains';
import { useUrlParams } from '@/lib/use-url-params';

// Preserve the Settings tab and other URL keys; only the four audit fields reach the API.
const paramsSchema = z.looseObject({
  tab: z.string().catch('general'),
  tag: z.enum(AUDIT_TAGS).or(z.literal('')).catch(''),
  actorId: z.string().max(200).catch(''),
  from: z.iso.datetime().or(z.literal('')).catch(''),
  to: z.iso.datetime().or(z.literal('')).catch(''),
});

export function useAuditLogFilters() {
  const { params, update } = useUrlParams(paramsSchema);
  const parsed = auditLogFiltersSchema.safeParse({
    ...(params.tag ? { tag: params.tag } : {}),
    ...(params.actorId ? { actorId: params.actorId } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  });
  const filters = parsed.success ? parsed.data : {};
  const setFilters = (next: AuditLogFilters) =>
    update({
      tab: 'audit-log',
      tag: next.tag ?? '',
      actorId: next.actorId ?? '',
      from: next.from ?? '',
      to: next.to ?? '',
    });
  return { filters, setFilters };
}
