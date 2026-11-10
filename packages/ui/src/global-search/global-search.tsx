'use client';

import { useId, useRef, useState } from 'react';
import { usePopover } from '../app-shell/use-popover';
import { SearchResults } from './search-results';
import { useSearchKeyboard } from './hooks/use-search-keyboard';
import { SearchInput } from './components/search-input';
import type { GlobalSearchProps } from './types';
import styles from './global-search.module.css';

/** BR-491: presentation only; caller owns debounced data and destination routing. */
export function GlobalSearch(props: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const root = useRef<HTMLFormElement>(null);
  const popover = usePopover(root);
  const id = useId();
  const short = query.trim().length < 2;
  const shown = props.open && popover.open && !short && !props.loading && !props.errorText;
  const statusText = short ? props.hintText : props.loading ? props.loadingText : props.errorText;
  const statusShown = popover.open && !!statusText && (short || props.open);
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
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) popover.close();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const selected = keyboard.selected;
        if (shown && selected) pick(selected.kind, selected.item);
      }}
    >
      <div className={styles.box}>
        <SearchInput
          shown={shown}
          id={id}
          index={keyboard.index}
          value={query}
          placeholder={props.placeholder}
          clearLabel={props.clearLabel}
          statusId={statusShown ? id + '-status' : undefined}
          onClear={clear}
          onKeyDown={keyboard.onKeyDown}
          onChange={(value) => {
            keyboard.select(-1);
            setQuery(value);
            props.onQuery(value);
            if (!popover.open) popover.toggle();
          }}
          onFocus={() => {
            if (!popover.open && (!short || props.hintText)) popover.toggle();
          }}
        />
        {statusShown && (
          <div
            id={`${id}-status`}
            role={props.errorText && !short ? 'alert' : 'status'}
            className={styles.dropdown}
          >
            <div className={styles.empty}>{statusText}</div>
          </div>
        )}
        {shown && (
          <div id={id} role="listbox" aria-label={props.placeholder} className={styles.dropdown}>
            <SearchResults
              groups={props.groups}
              emptyText={props.emptyQueryText?.(query.trim()) ?? props.emptyText}
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
