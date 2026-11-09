import {
  regionalShareSummarySchema,
  regionalSharePageSchema,
  regionalPayoutHistorySchema,
  regionalPayoutResultSchema,
  regionalWriteResultSchema,
  type RegionalSlot,
  type RegionalRegion,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
export const saveRegionalPayeeBank = (
  region: RegionalRegion,
  userId: string,
  bank: RegionalSlot['bank'],
) =>
  api(`/admin/regional-directors/${region}/payees/${encodeURIComponent(userId)}/bank`, {
    method: 'PUT',
    body: bank,
    schema: regionalWriteResultSchema,
  });
export const regionalShareKey = ['admin-regional-shares'] as const;
export const fetchRegionalShares = (q: string) =>
  api(`/admin/gdv/shares?${new URLSearchParams({ q })}`, { schema: regionalShareSummarySchema });
export const fetchRegionalSharePage = (region: RegionalRegion, cursor?: string) =>
  api(`/admin/gdv/${region}/shares?${new URLSearchParams(cursor ? { cursor } : {})}`, {
    schema: regionalSharePageSchema,
  });
export const fetchRegionalPayoutHistory = (region: RegionalRegion) =>
  api(`/admin/gdv/${region}/payouts`, { schema: regionalPayoutHistorySchema });
export const payRegionalShares = (region: RegionalRegion, directorUserId: string, key: string) =>
  api(`/admin/gdv/${region}/payouts`, {
    method: 'POST',
    body: { directorUserId },
    idempotencyKey: key,
    schema: regionalPayoutResultSchema,
  });
