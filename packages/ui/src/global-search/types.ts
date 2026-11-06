import type { SearchHit, SearchKind } from '@opchub/shared/api-domains';

export interface GlobalSearchProps {
  placeholder: string;
  emptyText: string;
  clearLabel: string;
  groups: { kind: SearchKind; label: string; items: SearchHit[] }[];
  open: boolean;
  onQuery: (query: string) => void;
  onPick: (kind: SearchKind, item: SearchHit) => void;
}
