'use client';

import type { AdminPermissionKey } from '@opchub/shared';
import type { AdminRoleRow } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { fetchAdminMe } from '@/features/auth';
import { useAuthStore } from '@/lib/auth-store';
import { useCan } from '@/lib/permissions';
import { createRole, deleteRole, fetchRoles, saveMatrix, settingsKeys } from '../api';
import { countPermissionChanges, matrixOf, type RoleMatrix, togglePermission } from '../model';
import type { ConfirmRequest } from '../types';
import { useSettingsMutation } from './use-settings-mutation';
import { useNumberText } from '@/i18n/use-number-text';

/**
 * RB-R04, R05, NA-28 "Vai trò & phân quyền": bản nháp ma trận ở client; "Lưu" hỏi xác nhận rồi
 * `PUT /admin/admin-roles/permissions`; sau lưu tải lại `/admin/auth/me` để quyền của chính người
 * lưu áp ngay. Thêm / xoá vai trò tự tạo (AT-RB05: còn TK giữ → server 409, toast câu server).
 */
export function useRoles(ask: (r: ConfirmRequest) => void) {
  const numberText = useNumberText();
  const t = useTranslations('settings.roles');
  const c = useTranslations('settings.common');
  const toast = useToast();
  const canEdit = useCan('settings.admins');
  const setMe = useAuthStore((s) => s.setMe);
  const q = useQuery({ queryKey: settingsKeys.roles, queryFn: fetchRoles });
  const roles = useMemo(() => q.data ?? [], [q.data]);
  const base = useMemo(() => matrixOf(roles), [roles]);
  const [draft, setDraft] = useState<RoleMatrix | null>(null);
  const cur = draft ?? base;
  const save = useSettingsMutation({ key: settingsKeys.roles, fn: saveMatrix });
  const create = useSettingsMutation({ key: settingsKeys.roles, fn: createRole });
  const remove = useSettingsMutation({ key: settingsKeys.roles, fn: deleteRole });

  const refreshMe = () =>
    void fetchAdminMe()
      .then(setMe)
      .catch(() => undefined);

  return {
    roles,
    matrix: cur,
    canEdit,
    toggle: (roleId: string, k: AdminPermissionKey) => {
      if (canEdit) setDraft(togglePermission(cur, roleId, k));
    },
    save: () => {
      const n = countPermissionChanges(base, cur);
      if (!n) return toast(t('noChange'));
      ask({
        title: t('confirmTitle'),
        body: t('confirmBody', { n: numberText(n) }),
        okLabel: t('confirmOk'),
        cancelLabel: c('cancel'),
        onOk: () =>
          save.mutate(Object.fromEntries(Object.entries(cur).map(([id, k]) => [id, [...k]])), {
            onSuccess: () => {
              setDraft(null);
              refreshMe();
              toast(t('saved'));
            },
          }),
      });
    },
    add: (name: string, description: string, done: () => void) => {
      const n = name.trim();
      if (!n) return toast(t('nameRequired'));
      create.mutate(
        { name: n, description: description.trim() },
        {
          onSuccess: (r) => {
            done();
            toast(t('added', { name: r.name }));
          },
        },
      );
    },
    remove: (r: AdminRoleRow) =>
      ask({
        title: t('deleteTitle', { name: r.name }),
        body: t('deleteBody'),
        okLabel: t('delete'),
        cancelLabel: c('cancel'),
        danger: true,
        onOk: () => remove.mutate(r.id, { onSuccess: () => toast(t('deleted', { name: r.name })) }),
      }),
  };
}
