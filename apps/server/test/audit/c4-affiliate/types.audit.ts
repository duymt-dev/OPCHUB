export interface Anchor {
  file: string;
  re: RegExp;
}

export interface AffiliateEdge {
  id: string;
  label: string;
  transition?: { machine: 'affiliate' | 'referral' | 'commission'; from: string; to: string };
  implementation: readonly Anchor[];
  trigger:
    | { kind: 'worker'; label: string; anchors: readonly Anchor[] }
    | { kind: 'http'; routes: readonly string[] };
  positive: Anchor;
  blocked: Anchor;
}

export const S = 'apps/server/src/modules/affiliate';
export const T = 'apps/server/test/affiliate';
export const PROCESSOR = 'apps/server/src/worker/processors/affiliate.processor.ts';
