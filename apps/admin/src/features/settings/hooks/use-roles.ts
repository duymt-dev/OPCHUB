'use client';

import { hasPermission, type PermissionKey } from '@opchub/shared';
import type { RolePermissions } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { fetchRoles, saveRoles, settingsKeys } from '../api';
import { countPermissionChanges, togglePermission, type EditableRole } from '../model';
import type { ConfirmRequest } from '../types';
import { useSettingsMutation } from './use-settings-mutation';

/**
 * D-69 / D-80 Vai trò & phân quyền: bản nháp ma trận ở client, "Lưu" hỏi xác nhận rồi
 * `PUT /admin/roles/permissions` (D-42: cần `s.role`, BE kiểm lại + ghi audit).
 */
export function useRoles(ask: (r: ConfirmRequest) => void) {
  const t = useTranslations('settings.roles');
  const c = useTranslations('settings.common');
  const toast = useToast();
  const role = useAuthStore((s) => s.me?.systemRole ?? 'member');
  const canEdit = hasPermission(role, 's.role');
  const q = useQuery({ queryKey: settingsKeys.roles, queryFn: fetchRoles });
  const [draft, setDraft] = useState<RolePermissions | null>(null);
  const cur = draft ?? q.data;
  const m = useSettingsMutation({ key: settingsKeys.roles, fn: saveRoles, write: true });

  const toggle = (r: EditableRole, k: PermissionKey) => {
    if (!canEdit || !cur) return;
    setDraft(togglePermission(cur, r, k));
  };

  const save = () => {
    if (!cur || !q.data) return;
    if (!canEdit) return toast(t('readOnly'));
    const n = countPermissionChanges(q.data, cur);
    ask({
      title: t('confirmTitle'),
      body: t('confirmBody', { n }),
      okLabel: t('confirmOk'),
      cancelLabel: c('cancel'),
      onOk: () =>
        m.mutate(cur, {
          onSuccess: () => {
            setDraft(null);
            toast(t('saved'));
          },
        }),
    });
  };

  return { perms: cur, canEdit, toggle, save };
}
