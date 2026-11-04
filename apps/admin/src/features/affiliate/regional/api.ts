import {
  regionalDirectorsSchema,
  regionalCandidatesSchema,
  regionalWriteResultSchema,
  type RegionalRegion,
  type RegionalPatch,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export const regionalKey = ['admin-regional-directors'] as const;
export const fetchRegional = () => api('/admin/gdv', { schema: regionalDirectorsSchema });
export const fetchRegionalCandidates = (region: RegionalRegion, q: string) =>
  api(`/admin/gdv/candidates?${new URLSearchParams({ region, q })}`, {
    schema: regionalCandidatesSchema,
  });
export const appointRegional = (region: RegionalRegion, userId: string) =>
  api('/admin/gdv', {
    method: 'POST',
    body: { region, userId },
    schema: regionalWriteResultSchema,
  });
export const revokeRegional = (region: RegionalRegion) =>
  api(`/admin/gdv/${region}`, { method: 'DELETE', schema: regionalWriteResultSchema });
export const patchRegional = (region: RegionalRegion, body: RegionalPatch) =>
  api(`/admin/gdv/${region}`, { method: 'PATCH', body, schema: regionalWriteResultSchema });
