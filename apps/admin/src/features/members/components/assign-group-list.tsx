'use client';

import type { AdminMember, GroupItem } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import styles from './assign-modal.module.css';

interface Props {
  groups: GroupItem[];
  targets: AdminMember[];
  picked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/** Lưới nhóm có ô tick; nhóm mọi người được chọn đã tham gia thì mờ, không chọn được */
export function AssignGroupList({ groups, targets, picked, onToggle }: Props) {
  const t = useTranslations('members.assign');
  return (
    <div className={styles.list}>
      {groups.map((g) => {
        const already = targets.every((m) => m.groupIds.includes(g.id));
        const on = picked.has(g.id);
        return (
          <button
            key={g.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-disabled={already}
            className={`${styles.group} ${on ? styles.on : ''} ${already ? styles.done : ''}`}
            onClick={() => !already && onToggle(g.id)}
          >
            <span className={styles.box} aria-hidden>
              {on ? '✓' : ''}
            </span>
            <span className={styles.gtext}>
              <span className={styles.gname}>{g.name}</span>
              <span className={styles.gsub}>{already ? t('already') : g.province}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
