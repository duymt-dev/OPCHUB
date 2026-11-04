import type { RegionalPatch } from '@opchub/shared/api-domains';

export type RegionalAction =
  | { kind: 'appoint'; userId: string; name: string; email: string }
  | { kind: 'revoke'; name: string }
  | { kind: 'patch'; patch: RegionalPatch };
