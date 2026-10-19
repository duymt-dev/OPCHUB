'use client';

import { ADMIN_MENUS, ADMIN_PERMISSIONS, type AdminPermissionKey } from '@opchub/shared';
import type { AdminRoleRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { isSuperRole, type RoleMatrix } from '../model';
import styles from './roles.module.css';

const menuLabel = (k: string) => ADMIN_MENUS.find((m) => m.key === k)?.label ?? k;

/** Ma trận 25 khoá × vai trò (RB-R05): nhóm theo menu, Super Admin khoá cứng ✓ */
export function RoleMatrixTable({
  roles,
  matrix,
  canEdit,
  onToggle,
}: {
  roles: readonly AdminRoleRow[];
  matrix: RoleMatrix;
  canEdit: boolean;
  onToggle: (roleId: string, k: AdminPermissionKey) => void;
}) {
  const t = useTranslations('settings.roles');
  const cols = { '--n': roles.length } as CSSProperties;
  return (
    <div className={styles.wrap}>
      <div className={styles.table} role="table" aria-label={t('heading')}>
        <div className={`${styles.row} ${styles.head}`} style={cols} role="row">
          <span className={styles.label} role="columnheader">
            {t('permission')}
          </span>
          {roles.map((r) => (
            <span key={r.id} className={styles.colHead} role="columnheader">
              {r.name}
            </span>
          ))}
        </div>
        {ADMIN_PERMISSIONS.map((p, i) => (
          <div key={p.key} className={styles.row} style={cols} role="row">
            <span className={styles.label} role="rowheader">
              {i === 0 || ADMIN_PERMISSIONS[i - 1]?.menu !== p.menu ? (
                <span className={styles.group}>{menuLabel(p.menu)}</span>
              ) : null}
              {p.label}
            </span>
            {roles.map((r) => {
              const sa = isSuperRole(r);
              const on = sa || (matrix[r.id] ?? []).includes(p.key);
              return (
                <div key={r.id} className={styles.cell} role="cell">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-disabled={sa || !canEdit}
                    aria-label={t('cell', { perm: p.label, role: r.name })}
                    className={`${styles.tick} ${on ? styles.on : ''} ${sa ? styles.locked : ''}`}
                    onClick={() => !sa && onToggle(r.id, p.key)}
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
  );
}
