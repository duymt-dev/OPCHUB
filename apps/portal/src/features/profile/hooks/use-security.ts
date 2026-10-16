'use client';

import { ssoProviders } from '@opchub/shared/fixtures';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { changePassword, profileKeys, revokeOtherSessions, setSsoLink } from '../api';
import { checkPassword } from '../model';
import { useErrorToast } from './use-profile';

/** Tab "Bảo mật": đổi mật khẩu, liên kết SSO, đăng xuất thiết bị khác */
export function useSecurity(linked: string[]) {
  const t = useTranslations('profile.toast');
  const toast = useToast();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });

  const change = useMutation({
    mutationFn: changePassword,
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

  const providers = ssoProviders.map((p) => ({
    id: p.id,
    name: p.name,
    linked: linked.includes(p.id),
  }));

  return {
    pw,
    setPw: (k: keyof typeof pw, v: string) => setPw((s) => ({ ...s, [k]: v })),
    submit,
    busy: change.isPending,
    providers,
    toggleSso: (p: { id: string; name: string; linked: boolean }) =>
      sso.mutate({ id: p.id, on: !p.linked, name: p.name }),
    logoutOthers: () => revoke.mutate(),
  };
}
