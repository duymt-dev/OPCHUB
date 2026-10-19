'use client';

import type { AdminRoleRow } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { createAdmin, settingsKeys } from '../api';
import { isSuperRole, tempPassword } from '../model';
import { useSettingsMutation } from './use-settings-mutation';

export interface AdminDraft {
  name: string;
  phone: string;
  email: string;
  roleId: string;
  password: string;
}
export type AdminDraftErrors = Partial<Record<keyof AdminDraft, string>>;

/**
 * Drawer "Tạo tài khoản quản trị" (RB-R02, QT-RB-01): lỗi server hiện tại ô (AT-RB01 — email thành
 * viên / trùng TK quản trị); vai trò mặc định là vai trò sửa được đầu tiên (Quản trị viên).
 */
export function useAdminCreate(roles: readonly AdminRoleRow[]) {
  const t = useTranslations('settings.admins.drawer');
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<AdminDraft>({
    name: '',
    phone: '',
    email: '',
    roleId: '',
    password: '',
  });
  const [errors, setErrors] = useState<AdminDraftErrors>({});
  const m = useSettingsMutation({ key: settingsKeys.admins, fn: createAdmin, silent: true });

  return {
    open,
    f,
    errors,
    busy: m.isPending,
    start: () => {
      setErrors({});
      setF({
        name: '',
        phone: '',
        email: '',
        roleId: roles.find((r) => !isSuperRole(r))?.id ?? '',
        password: tempPassword(),
      });
      setOpen(true);
    },
    close: () => setOpen(false),
    set: (k: keyof AdminDraft, v: string) => setF((x) => ({ ...x, [k]: v })),
    generate: () => setF((x) => ({ ...x, password: tempPassword() })),
    submit: () =>
      m.mutate(
        { ...f, phone: f.phone.trim() || null },
        {
          onSuccess: (r) => {
            setOpen(false);
            toast(t('created', { name: r.name }));
          },
          onError: (e) => {
            if (!(e instanceof ApiError)) return toast(String(e));
            const next: AdminDraftErrors = {};
            for (const x of e.fields) {
              if (x.path in f) next[x.path as keyof AdminDraft] = x.message;
            }
            if (Object.keys(next).length) setErrors(next);
            else toast(e.message);
          },
        },
      ),
  };
}
