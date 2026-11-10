import { Icon } from '../../icons';
import type { SearchInputProps } from '../types';
import styles from '../global-search.module.css';

export function SearchInput(props: SearchInputProps) {
  return (
    <div className={styles.inputBox}>
      <Icon name="search" size={16} />
      <input
        role="combobox"
        aria-expanded={props.shown}
        aria-controls={props.id}
        aria-activedescendant={
          props.shown && props.index >= 0 ? `${props.id}-${props.index}` : undefined
        }
        aria-autocomplete="list"
        aria-describedby={props.statusId}
        aria-label={props.placeholder}
        placeholder={props.placeholder}
        maxLength={100}
        value={props.value}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
          props.onKeyDown(event);
        }}
        onChange={(event) => props.onChange(event.target.value)}
        onFocus={props.onFocus}
      />
      {props.shown && (
        <button type="button" aria-label={props.clearLabel} onClick={props.onClear}>
          ×
        </button>
      )}
    </div>
  );
}
