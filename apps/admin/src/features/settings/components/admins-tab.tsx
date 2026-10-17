'use client';

import { INVITABLE_ROLES, type AdminAccount } from '@opchub/shared/api-domains';
import { UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useAdmins } from '../hooks/use-admins';
import { useRelTime } from '../hooks/use-rel-time';
import type { AskConfirm } from '../types';
import styles from './admins.module.css';
import ui from './settings.module.css';

const COLS = ['account', 'role', 'tfa', 'last'] as const;

function AdminRow({ x, onRevoke }: { x: AdminAccount; onRevoke: () => void }) {
  const t = useTranslations('settings.admins');
  const tr = useTranslations('settings.roles.names');
  const rel = useRelTime();
  const owner = x.role === 'super_admin';
  const last =
    x.status === 'invited'
      ? t('pending')
      : x.online
        ? t('online')
        : x.lastLoginAt
          ? rel(x.lastLoginAt)
          : '—';
  return (
    <div className={styles.row} role="row">
      <div className={styles.who} role="cell">
        <UserAvatar name={x.name} size={34} src={x.avatarUrl ?? undefined} />
        <div className={styles.whoText}>
          <b className={styles.name}>{x.name}</b>
          <span className={styles.mail}>{x.email}</span>
        </div>
      </div>
      <span role="cell" className={`${styles.pill} ${styles[x.role]}`}>
        {tr(x.role)}
      </span>
      <span role="cell" className={`${styles.pill} ${x.twoFactor ? styles.tfaOn : styles.tfaOff}`}>
        {x.twoFactor ? t('tfaOn') : t('tfaOff')}
      </span>
      <span role="cell" className={styles.last}>
        {last}
      </span>
      <button
        type="button"
        className={`${styles.revoke} ${owner ? styles.owner : ''}`}
        aria-disabled={owner}
        onClick={onRevoke}
      >
        {owner ? t('owner') : t('revoke')}
      </button>
    </div>
  );
}

/** D-73 / D-74 "Tài khoản quản trị": mời theo email + vai trò, bảng 2FA / đăng nhập, thu hồi */
export function AdminsTab({ ask }: { ask: AskConfirm }) {
  const t = useTranslations('settings.admins');
  const tr = useTranslations('settings.roles.names');
  const a = useAdmins(ask);

  return (
    <section className={ui.card}>
      <div className={ui.head}>
        <div className={ui.h18}>{t('heading')}</div>
        <div className={ui.muted}>{t('count', { n: a.rows.length })}</div>
      </div>
      <div className={styles.invite}>
        <input
          className={styles.email}
          value={a.email}
          placeholder={t('invitePh')}
          aria-label={t('invitePh')}
          onChange={(e) => a.setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && a.invite()}
        />
        <select
          className={styles.role}
          value={a.inviteRole}
          aria-label={t('roleLabel')}
          onChange={(e) => {
            const r = INVITABLE_ROLES.find((x) => x === e.target.value);
            if (r) a.setInviteRole(r);
          }}
        >
          {INVITABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {tr(r)}
            </option>
          ))}
        </select>
        <button type="button" className={styles.send} onClick={a.invite}>
          {t('invite')}
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
            <AdminRow key={x.id} x={x} onRevoke={() => a.revoke(x)} />
          ))}
        </div>
      </div>
    </section>
  );
}
