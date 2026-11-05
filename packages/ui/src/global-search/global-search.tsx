'use client';

import { useId, useRef, useState } from 'react';
import { usePopover } from '../app-shell/use-popover';
import { SearchResults } from './search-results';
import { useSearchKeyboard } from './hooks/use-search-keyboard';
import { Icon } from '../icons';
import type { GlobalSearchProps } from './types';
import styles from './global-search.module.css';

/** BR-491: presentation only; caller owns debounced data and destination routing. */
export function GlobalSearch(props: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const root = useRef<HTMLFormElement>(null);
  const popover = usePopover(root);
  const id = useId();
  const shown = props.open && popover.open && query.trim().length >= 2;
  const clear = () => {
    setQuery('');
    props.onQuery('');
    popover.close();
  };
  const pick: GlobalSearchProps['onPick'] = (kind, item) => {
    clear();
    props.onPick(kind, item);
  };
  useSearchKeyboard(shown, clear);
  return (
    <form
      ref={root}
      role="search"
      aria-label={props.placeholder}
      className={styles.wrap}
      onSubmit={(event) => {
        event.preventDefault();
        const first = props.groups[0];
        if (shown && first?.items[0]) pick(first.kind, first.items[0]);
      }}
    >
      <div className={styles.box}>
        <div className={styles.inputBox}>
          <Icon name="search" size={16} />
          <input
            role="combobox"
            aria-expanded={shown}
            aria-controls={id}
            aria-autocomplete="list"
            aria-label={props.placeholder}
            placeholder={props.placeholder}
            maxLength={100}
            value={query}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                clear();
              }
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              props.onQuery(event.target.value);
              if (!popover.open) popover.toggle();
            }}
            onFocus={() => {
              if (!popover.open && query.trim().length >= 2) popover.toggle();
            }}
          />
          {shown && (
            <button type="button" aria-label={props.clearLabel} onClick={clear}>
              ×
            </button>
          )}
        </div>
        {shown && (
          <div id={id} role="listbox" aria-label={props.placeholder} className={styles.dropdown}>
            <SearchResults groups={props.groups} emptyText={props.emptyText} onPick={pick} />
          </div>
        )}
      </div>
    </form>
  );
}
