'use client';

import type { SsoCallback } from '@opchub/shared/api';
import {
  AuthHeader,
  EmptyState,
  RegisterForm,
  SubmitButton,
  TypeChoice,
  useToast,
} from '@opchub/ui';
import type { RegisterKind } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { ssoCallback, ssoComplete } from '../api';
import { useRegisterCommon } from '../hooks/use-register-common';
import { AuthFrame } from './auth-frame';
import { GroupsRow, PhoneRow } from './register-common-fields';

/** D-45: callback SSO — email đã có TK thì vào luôn; mới thì bổ sung loại TK, nhóm, SĐT (bỏ OTP) */
export function SsoCompleteScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const provider = params.get('provider') ?? '';
  const code = params.get('code') ?? '';
  const setSession = useAuthStore((s) => s.setSession);
  const q = useQuery({
    queryKey: ['sso-callback', provider, code],
    queryFn: () => ssoCallback(provider, code),
    enabled: Boolean(provider && code),
    retry: false,
  });

  useEffect(() => {
    if (q.data?.status !== 'existing') return;
    setSession(q.data.accessToken, q.data.me);
    router.replace('/community');
  }, [q.data, router, setSession]);

  if (q.isError) return <EmptyState title={t('sso.failed')} />;
  if (q.data?.status !== 'new') return <EmptyState title={t('sso.loading')} />;
  return <SsoNewMember data={q.data} />;
}

function SsoNewMember({ data }: { data: Extract<SsoCallback, { status: 'new' }> }) {
  const t = useTranslations('auth');
  const toast = useToast();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const f = useRegisterCommon();
  const [kind, setKind] = useState<RegisterKind>();

  const submit = async () => {
    if (!f.groupIds.length) return toast(t('register.errGroups'));
    const res = await ssoComplete({
      ssoToken: data.ssoToken,
      accountType: kind === 'biz' ? 'business' : 'personal',
      phone: { country: f.phoneCountry, number: f.phone },
      groupIds: f.groupIds,
    });
    setSession(res.accessToken, res.me);
    router.replace('/community');
  };

  return (
    <AuthFrame>
      <AuthHeader title={t('sso.title')} sub={t('sso.sub', { email: data.email })} />
      <TypeChoice
        title={t('sso.accountType')}
        chooseLabel={t('register.choose')}
        cards={[
          { kind: 'biz', title: t('register.bizCard'), desc: t('register.bizCardDesc') },
          { kind: 'per', title: t('register.perCard'), desc: t('register.perCardDesc') },
        ]}
        selected={kind}
        onPick={setKind}
      />
      {kind ? (
        <RegisterForm>
          <PhoneRow f={f} />
          <GroupsRow f={f} />
          <SubmitButton onClick={() => void submit()}>{t('sso.submit')}</SubmitButton>
        </RegisterForm>
      ) : null}
    </AuthFrame>
  );
}
