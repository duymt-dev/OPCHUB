'use client';

import type { AdminRoleRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { isSuperRole } from '../model';
import styles from './roles.module.css';

/**
 * RB-R09: "Xem thử với vai trò…" — chỉ hiện cho người có `settings.admins`. Chọn → quyền xem thử
 * trong bộ nhớ (không gọi server, không lưu qua tải lại); khung Admin hiện dải cam + "Thoát xem thử".
 */
export function RolePreviewSelect({ roles }: { roles: readonly AdminRoleRow[] }) {
  const t = useTranslations('settings.roles');
  const preview = useAuthStore((s) => s.preview);
  const setPreview = useAuthStore((s) => s.setPreview);
  return (
    <select
      className={styles.preview}
      value={preview?.roleId ?? ''}
      title={t('previewTitle')}
      aria-label={t('previewTitle')}
      data-ro-ok="1"
      onChange={(e) => {
        const r = roles.find((x) => x.id === e.target.value);
        setPreview(r ? { roleId: r.id, roleName: r.name, permissions: r.permissions } : null);
      }}
    >
      <option value="">{t('preview')}</option>
      {roles
        .filter((r) => !isSuperRole(r))
        .map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
    </select>
  );
}
