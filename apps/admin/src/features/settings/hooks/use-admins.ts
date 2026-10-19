'use client';

import type { AdminAccountRow } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchAdmins, revokeAdmin, setAdminRole, setAdminStatus, settingsKeys } from '../api';
import type { ConfirmRequest } from '../types';
import { useSettingsMutation } from './use-settings-mutation';

/**
 * RB-R02, R04, R08 "Tài khoản quản trị": đổi vai trò, khoá (xác nhận) / mở khoá, thu hồi (xác nhận).
 * Super Admin không thao tác được (server 409, FE ẩn nút). Mọi thao tác server ghi audit.
 */
export function useAdmins(ask: (r: ConfirmRequest) => void) {
  const t = useTranslations('settings.admins');
  const c = useTranslations('settings.common');
  const toast = useToast();
  const q = useQuery({ queryKey: settingsKeys.admins, queryFn: fetchAdmins });
  const status = useSettingsMutation({
    key: settingsKeys.admins,
    fn: (v: { a: AdminAccountRow; locked: boolean }) =>
      setAdminStatus(v.a.id, v.locked ? 'locked' : 'active'),
    onDone: (_r, v) => toast(t(v.locked ? 'locked_toast' : 'unlocked_toast', { name: v.a.name })),
  });
  const role = useSettingsMutation({
    key: settingsKeys.admins,
    fn: (v: { a: AdminAccountRow; roleId: string }) => setAdminRole(v.a.id, v.roleId),
    onDone: (r) => toast(t('roleChanged', { name: r.name, role: r.roleName ?? '' })),
  });
  const revoke = useSettingsMutation({ key: settingsKeys.admins, fn: revokeAdmin });

  return {
    rows: q.data ?? [],
    setRole: (a: AdminAccountRow, roleId: string) => {
      if (roleId !== a.roleId) role.mutate({ a, roleId });
    },
    toggleLock: (a: AdminAccountRow) => {
      if (a.isSuperAdmin) return;
      if (a.status === 'locked') return status.mutate({ a, locked: false });
      ask({
        title: t('lockTitle'),
        body: t('lockBody', { name: a.name }),
        okLabel: t('lock'),
        cancelLabel: c('cancel'),
        danger: true,
        onOk: () => status.mutate({ a, locked: true }),
      });
    },
    revoke: (a: AdminAccountRow) => {
      if (a.isSuperAdmin) return;
      ask({
        title: t('confirmTitle'),
        body: t('confirmBody', { name: a.name, email: a.email }),
        okLabel: t('revoke'),
        cancelLabel: c('cancel'),
        danger: true,
        onOk: () => revoke.mutate(a.id, { onSuccess: () => toast(t('revoked', { name: a.name })) }),
      });
    },
  };
}
