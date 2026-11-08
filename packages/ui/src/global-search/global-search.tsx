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
  const keyboard = useSearchKeyboard(shown, clear, props.groups);
  return (
    <form
      ref={root}
      role="search"
      aria-label={props.placeholder}
      className={styles.wrap}
      onSubmit={(event) => {
        event.preventDefault();
        const selected = keyboard.selected;
        if (shown && selected) pick(selected.kind, selected.item);
      }}
    >
      <div className={styles.box}>
        <div className={styles.inputBox}>
          <Icon name="search" size={16} />
          <input
            role="combobox"
            aria-expanded={shown}
            aria-controls={id}
            aria-activedescendant={
              shown && keyboard.index >= 0 ? `${id}-${keyboard.index}` : undefined
            }
            aria-autocomplete="list"
            aria-label={props.placeholder}
            placeholder={props.placeholder}
            maxLength={100}
            value={query}
            onKeyDown={keyboard.onKeyDown}
            onChange={(event) => {
              keyboard.select(-1);
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
            <SearchResults
              groups={props.groups}
              emptyText={props.emptyText}
              onPick={pick}
              id={id}
              selected={keyboard.index}
              onSelect={keyboard.select}
            />
          </div>
        )}
      </div>
    </form>
  );
}
