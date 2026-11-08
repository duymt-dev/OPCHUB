import type { SearchResultsProps } from './types';
import { theme } from 'antd';
import styles from './global-search.module.css';

export function SearchResults(props: SearchResultsProps) {
  const { token } = theme.useToken();
  return (
    <>
      {props.groups.map((group, groupIndex) => {
        const start = props.groups.slice(0, groupIndex).reduce((sum, g) => sum + g.items.length, 0);
        return (
          <div key={group.kind} role="presentation">
            <div role="presentation" className={styles.label}>
              {group.label}
            </div>
            {group.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                id={`${props.id}-${start + index}`}
                aria-selected={props.selected === start + index}
                style={
                  props.selected === start + index
                    ? { background: token.controlItemBgActive }
                    : undefined
                }
                onMouseEnter={() => props.onSelect(start + index)}
                onFocus={() => props.onSelect(start + index)}
                className={styles.item}
                onClick={() => props.onPick(group.kind, item)}
              >
                <span className={styles.title}>{item.title}</span>
                <span className={styles.sub}>{item.sub}</span>
              </button>
            ))}
          </div>
        );
      })}
      {!props.groups.length && <div className={styles.empty}>{props.emptyText}</div>}
    </>
  );
}
