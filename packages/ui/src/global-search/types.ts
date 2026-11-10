import type { SearchHit, SearchKind } from '@opchub/shared/api-domains';
import type { KeyboardEventHandler } from 'react';

export interface GlobalSearchProps {
  placeholder: string;
  emptyText: string;
  clearLabel: string;
  hintText?: string;
  loadingText?: string;
  errorText?: string;
  loading?: boolean;
  emptyQueryText?: (query: string) => string;
  groups: { kind: SearchKind; label: string; items: SearchHit[] }[];
  open: boolean;
  onQuery: (query: string) => void;
  onPick: (kind: SearchKind, item: SearchHit) => void;
}

export type SearchResultsProps = Pick<GlobalSearchProps, 'groups' | 'emptyText' | 'onPick'> & {
  id: string;
  selected: number;
  onSelect: (index: number) => void;
};

export type SearchInputProps = Pick<GlobalSearchProps, 'placeholder' | 'clearLabel'> & {
  shown: boolean;
  value: string;
  id: string;
  index: number;
  statusId?: string | undefined;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onClear: () => void;
};
