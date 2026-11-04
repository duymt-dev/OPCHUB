import type { RegionalPatch } from '@opchub/shared/api-domains';
import type { RegionalShareSummary } from '@opchub/shared/api-domains';
export type RegionalShareRow = RegionalShareSummary['rows'][number];

export type RegionalAction =
  | { kind: 'appoint'; userId: string; name: string; email: string }
  | { kind: 'revoke'; name: string }
  | { kind: 'patch'; patch: RegionalPatch };
