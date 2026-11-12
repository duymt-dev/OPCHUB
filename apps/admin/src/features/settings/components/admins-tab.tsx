'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchRoles, settingsKeys } from '../api';
import { useAdminCreate } from '../hooks/use-admin-create';
import { useAdmins } from '../hooks/use-admins';
import { isSuperRole } from '../model';
import type { AskConfirm } from '../types';
import { AdminCreateDrawer } from './admin-create-drawer';
import { AdminRow } from './admin-row';
import styles from './admins.module.css';
import ui from './settings.module.css';
import { useNumberText } from '@/i18n/use-number-text';

const COLS = ['account', 'role', 'tfa', 'last'] as const;

/** RB-R02 / R04 / R08 "Tài khoản quản trị" — tách biệt TK thành viên (D-52) */
export function AdminsTab({ ask }: { ask: AskConfirm }) {
  const numberText = useNumberText();
  const t = useTranslations('settings.admins');
  const a = useAdmins(ask);
  const roles = useQuery({ queryKey: settingsKeys.roles, queryFn: fetchRoles }).data ?? [];
  const create = useAdminCreate(roles.filter((r) => !isSuperRole(r)));

  return (
    <section className={ui.card}>
      <div className={styles.headRow}>
        <div>
          <div className={ui.h18}>{t('heading')}</div>
          <div className={ui.muted}>{t('count', { n: numberText(a.rows.length) })}</div>
        </div>
        <button type="button" className={styles.create} onClick={create.start}>
          {t('create')}
        </button>
      </div>
      <div data-m="tbl" className={styles.wrap}>
        <div className={styles.table} role="table" aria-label={t('heading')}>
          <div className={`${styles.row} ${styles.head}`} role="row">
            {COLS.map((k) => (
              <span key={k} role="columnheader">
                {t(`cols.${k}`)}
              </span>
            ))}
            <span role="columnheader" />
          </div>
          {a.rows.map((x) => (
            <AdminRow
              key={x.id}
              x={x}
              roles={roles}
              onRole={(roleId) => a.setRole(x, roleId)}
              onLock={() => a.toggleLock(x)}
              onRevoke={() => a.revoke(x)}
            />
          ))}
        </div>
      </div>
      <AdminCreateDrawer c={create} roles={roles.filter((r) => !isSuperRole(r))} />
    </section>
  );
}
