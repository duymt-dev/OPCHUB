import type { GlobalSearchProps } from './types';
import styles from './global-search.module.css';

export function SearchResults(props: Pick<GlobalSearchProps, 'groups' | 'emptyText' | 'onPick'>) {
  return (
    <>
      {props.groups.map((group) => (
        <div key={group.kind} role="presentation">
          <div role="presentation" className={styles.label}>
            {group.label}
          </div>
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={false}
              className={styles.item}
              onClick={() => props.onPick(group.kind, item)}
            >
              <span className={styles.title}>{item.title}</span>
              <span className={styles.sub}>{item.sub}</span>
            </button>
          ))}
        </div>
      ))}
      {!props.groups.length && <div className={styles.empty}>{props.emptyText}</div>}
    </>
  );
}
