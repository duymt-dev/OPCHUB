'use client';

import { PERMISSION_GROUPS } from '@opchub/shared';
import { useTranslations } from 'next-intl';
import { useRoles } from '../hooks/use-roles';
import { EDITABLE_ROLES, PERM_MSG } from '../model';
import type { AskConfirm } from '../types';
import styles from './roles.module.css';
import ui from './settings.module.css';

const ROLES = ['super_admin', ...EDITABLE_ROLES] as const;

/**
 * D-69 ma trận vai trò × permission key (D-20: 14 quyền theo PERMISSION_GROUPS, Super Admin
 * khoá cứng). "Lưu" → xác nhận → toast "Đã lưu phân quyền" (D-80).
 */
export function RolesTab({ ask }: { ask: AskConfirm }) {
  const t = useTranslations('settings.roles');
  const c = useTranslations('settings.common');
  const { perms, canEdit, toggle, save } = useRoles(ask);
  if (!perms) return null;

  return (
    <section className={ui.card}>
      <div className={styles.headRow}>
        <div className={ui.head}>
          <div className={ui.h16}>{t('heading')}</div>
          <div className={ui.muted}>{canEdit ? t('headingSub') : t('readOnly')}</div>
        </div>
        <button type="button" className={ui.btnPrimary} onClick={save} disabled={!canEdit}>
          {c('save')}
        </button>
      </div>
      <div className={styles.wrap}>
        <div className={styles.table} role="table" aria-label={t('heading')}>
          <div className={`${styles.row} ${styles.head}`} role="row">
            <span className={styles.label} role="columnheader">
              {t('permission')}
            </span>
            {ROLES.map((r) => (
              <span key={r} className={styles.colHead} role="columnheader">
                {t(`names.${r}`)}
              </span>
            ))}
          </div>
          {PERMISSION_GROUPS.flatMap((g) => g.keys).map((k) => (
            <div key={k} className={styles.row} role="row">
              <span className={styles.label} role="rowheader">
                {t(PERM_MSG[k])}
              </span>
              {ROLES.map((r) => {
                const sa = r === 'super_admin';
                const on = sa || perms[r].includes(k);
                return (
                  <div key={r} className={styles.cell} role="cell">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-disabled={sa || !canEdit}
                      aria-label={t('cell', { perm: t(PERM_MSG[k]), role: t(`names.${r}`) })}
                      className={`${styles.tick} ${on ? styles.on : ''} ${sa ? styles.locked : ''}`}
                      onClick={() => !sa && toggle(r, k)}
                    >
                      {on ? '✓' : ''}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
