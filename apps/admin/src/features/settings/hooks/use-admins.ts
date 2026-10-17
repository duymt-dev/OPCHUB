'use client';

import { hasPermission } from '@opchub/shared';
import type { AdminAccount, INVITABLE_ROLES } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { fetchAdmins, inviteAdmin, revokeAdmin, settingsKeys } from '../api';
import { isEmail } from '../model';
import type { ConfirmRequest } from '../types';
import { useSettingsMutation } from './use-settings-mutation';

export type InviteRole = (typeof INVITABLE_ROLES)[number];

/** D-73 / D-74 Tài khoản quản trị: mời (kiểm email) + thu hồi (phá huỷ → xác nhận, audit) */
export function useAdmins(ask: (r: ConfirmRequest) => void) {
  const t = useTranslations('settings.admins');
  const c = useTranslations('settings.common');
  const toast = useToast();
  const role = useAuthStore((s) => s.me?.systemRole ?? 'member');
  const canManage = hasPermission(role, 's.role');
  const q = useQuery({ queryKey: settingsKeys.admins, queryFn: fetchAdmins });
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('admin');
  const invite = useSettingsMutation({ key: settingsKeys.admins, fn: inviteAdmin });
  const revoke = useSettingsMutation({ key: settingsKeys.admins, fn: revokeAdmin });

  return {
    rows: q.data ?? [],
    email,
    setEmail,
    inviteRole,
    setInviteRole,
    invite: () => {
      const em = email.trim();
      if (!isEmail(em)) return toast(t('invalid'));
      if (!canManage) return toast(t('noRole'));
      invite.mutate(
        { email: em, role: inviteRole },
        {
          onSuccess: () => {
            setEmail('');
            toast(t('invited', { email: em }));
          },
        },
      );
    },
    revoke: (a: AdminAccount) => {
      if (a.role === 'super_admin') return;
      if (!canManage) return toast(t('noRole'));
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
