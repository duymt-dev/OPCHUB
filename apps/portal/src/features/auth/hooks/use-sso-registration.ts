'use client';

import type { SsoCallback } from '@opchub/shared/api';
import type { RegisterKind } from '@opchub/ui';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useFormErrors } from '@/lib/use-form-errors';
import { ssoComplete } from '../api';
import { REGISTER_FIELD_MAP, type RegisterField } from '../register-validation';
import { useRegisterCommon } from './use-register-common';
import { leaveAuth } from '../keep-scroll';

export function useSsoRegistration(data: Extract<SsoCallback, { status: 'new' }>) {
  const t = useTranslations('auth');
  const tc = useTranslations('common.errors');
  const toast = useToast();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const fe = useFormErrors<RegisterField>();
  const common = useRegisterCommon(fe.clear, data.email);
  const [kind, setKind] = useState<RegisterKind>();
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (common.referral.pending) return toast(t('register.referral.checking'));
    if (
      fe.check({
        ...(!common.agree ? { agree: t('register.errAgree') } : {}),
        ...(common.referral.error ? { referralCode: common.referral.error } : {}),
      })
    )
      return;
    setBusy(true);
    try {
      const result = await ssoComplete({
        ssoToken: data.ssoToken,
        accountType: kind === 'biz' ? 'business' : 'personal',
        phone: { country: common.phoneCountry, number: common.phone },
        agreeTerms: true,
        ...(common.referral.code ? { referralCode: common.referral.code } : {}),
      });
      setSession(result.accessToken, result.me);
      leaveAuth(() => router.replace('/community'));
    } catch (e) {
      fe.fromApi(e, REGISTER_FIELD_MAP, tc('failed'));
    } finally {
      setBusy(false);
    }
  };
  return { common, kind, setKind, busy, submit, err: fe.err };
}
