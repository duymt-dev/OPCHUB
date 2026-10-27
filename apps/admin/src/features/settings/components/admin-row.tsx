'use client';

import type { AdminAccountRow, AdminRoleRow } from '@opchub/shared/api-domains';
import { UserAvatar } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRelTime } from '../hooks/use-rel-time';
import { isSuperRole, roleTone } from '../model';
import styles from './admins.module.css';

/** Cột "Đăng nhập gần nhất": đã khoá / đang online / thời gian tương đối / chưa đăng nhập */
function useLastLogin(x: AdminAccountRow): string {
  const t = useTranslations('settings.admins');
  const rel = useRelTime();
  if (x.status === 'locked') return t('locked');
  if (x.online) return t('online');
  return x.lastLoginAt ? rel(x.lastLoginAt) : t('never');
}

/** Một dòng bảng TK quản trị: Super Admin hiện nhãn vai trò + "Chủ sở hữu"; TK khác đổi vai trò, khoá, thu hồi */
export function AdminRow({
  x,
  roles,
  onRole,
  onLock,
  onRevoke,
}: {
  x: AdminAccountRow;
  roles: readonly AdminRoleRow[];
  onRole: (roleId: string) => void;
  onLock: () => void;
  onRevoke: () => void;
}) {
  const t = useTranslations('settings.admins');
  const locked = x.status === 'locked';
  const tone = roleTone(roles.findIndex((r) => r.id === x.roleId));
  const last = useLastLogin(x);
  return (
    <div className={styles.row} role="row">
      <div className={styles.who} role="cell">
        <UserAvatar name={x.name} src={x.avatarUrl} size={34} />
        <div className={styles.whoText}>
          <b className={styles.name}>{x.name}</b>
          <span className={styles.mail}>{x.email}</span>
        </div>
      </div>
      <div role="cell">
        {x.isSuperAdmin ? (
          <span className={styles.pill} style={{ background: tone.bg, color: tone.fg }}>
            {x.roleName}
          </span>
        ) : (
          <select
            className={styles.select}
            value={x.roleId ?? ''}
            aria-label={t('roleOf', { name: x.name })}
            onChange={(e) => onRole(e.target.value)}
          >
            {roles
              .filter((r) => !isSuperRole(r))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        )}
      </div>
      <span role="cell" className={`${styles.pill} ${x.twoFactor ? styles.tfaOn : styles.tfaOff}`}>
        {x.twoFactor ? t('tfaOn') : t('tfaOff')}
      </span>
      <span role="cell" className={styles.last}>
        {last}
      </span>
      <div role="cell" className={styles.actions}>
        {x.isSuperAdmin ? (
          <span className={`${styles.act} ${styles.owner}`}>{t('owner')}</span>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.act} ${locked ? styles.unlock : ''}`}
              onClick={onLock}
            >
              {locked ? t('unlock') : t('lock')}
            </button>
            <button type="button" className={`${styles.act} ${styles.danger}`} onClick={onRevoke}>
              {t('revoke')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
