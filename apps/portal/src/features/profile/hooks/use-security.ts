'use client';

import { LOGIN_SSO_IDS } from '@opchub/shared/api-domains';
import { ssoProviders } from '@opchub/shared/fixtures';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { refreshSession } from '@/lib/session';
import { changePassword, profileKeys, revokeOtherSessions, setSsoLink } from '../api';
import { checkPassword } from '../model';
import { useErrorToast } from './use-profile';

const LOGIN_IDS: readonly string[] = LOGIN_SSO_IDS;

/**
 * Tab "Bảo mật": đổi mật khẩu, liên kết SSO, đăng xuất thiết bị khác.
 * BUG-030, NA-17: TK chưa có mật khẩu không huỷ được liên kết SSO cuối cùng (`locked`).
 * D-89 (prototype v4): chỉ liệt kê nhà cung cấp còn dùng để đăng nhập (Google).
 */
export function useSecurity(linked: string[], hasPassword: boolean) {
  const t = useTranslations('profile.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });

  const change = useMutation({
    // Đổi mật khẩu tăng perm version → access token cũ hết hiệu lực; lấy phiên mới ngay để các
    // thao tác `/auth/*` tiếp theo (VD đăng xuất thiết bị khác) không bị 401
    mutationFn: async (v: Parameters<typeof changePassword>[0]) => {
      await changePassword(v);
      await refreshSession();
    },
    onSuccess: () => {
      setPw({ cur: '', next: '', confirm: '' });
      toast(t('password'));
    },
    onError,
  });
  const sso = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean; name: string }) => setSsoLink(id, on),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: profileKeys.me() });
      toast(v.on ? t('linked', { name: v.name }) : t('unlinked', { name: v.name }));
    },
    onError,
  });
  const revoke = useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: (r) => toast(t('loggedOut', { n: r.revoked })),
    onError,
  });

  const submit = () => {
    const c = checkPassword(pw.cur, pw.next, pw.confirm);
    if (!c.ok) return toast(c.error);
    change.mutate({ currentPassword: pw.cur, newPassword: pw.next });
  };

  const loginLinked = linked.filter((id) => LOGIN_IDS.includes(id));
  const lastLink = !hasPassword && loginLinked.length <= 1;
  const providers = ssoProviders
    .filter((p) => LOGIN_IDS.includes(p.id))
    .map((p) => {
      const on = linked.includes(p.id);
      return { id: p.id, name: p.name, linked: on, locked: on && lastLink };
    });

  return {
    pw,
    setPw: (k: keyof typeof pw, v: string) => setPw((s) => ({ ...s, [k]: v })),
    submit,
    busy: change.isPending,
    providers,
    lastLink,
    toggleSso: (p: { id: string; name: string; linked: boolean; locked: boolean }) => {
      if (!p.locked) sso.mutate({ id: p.id, on: !p.linked, name: p.name });
    },
    logoutOthers: () => revoke.mutate(),
  };
}
