'use client';

import { useTranslations } from 'next-intl';
import type { AdminGroup } from '../types';
import type { GroupRowActions } from './group-grid';
import styles from './group-table.module.css';

/** Write identity is semantic, never inferred from the current translated label. */
export function GroupTableActions({
  group,
  actions,
}: {
  group: AdminGroup;
  actions: GroupRowActions;
}) {
  const t = useTranslations('groups.list');
  return (
    <div className={styles.actions}>
      <button
        data-act="write"
        type="button"
        className={styles.btn}
        onClick={() => actions.onEdit(group)}
      >
        {t('edit')}
      </button>
      <button
        data-act="write"
        type="button"
        title={t('exportOneTitle')}
        className={`${styles.btn} ${styles.btnBlue}`}
        onClick={() => actions.onExport(group)}
      >
        {t('exportOne')}
      </button>
      <button type="button" className={styles.btn} onClick={() => actions.onChat(group)}>
        {t('chat')}
      </button>
      <button
        data-act="write"
        type="button"
        className={styles.btnDel}
        onClick={() => actions.onDelete(group)}
      >
        {t('delete')}
      </button>
    </div>
  );
}
