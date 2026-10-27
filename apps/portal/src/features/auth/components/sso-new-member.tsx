'use client';

import type { SsoCallback } from '@opchub/shared/api';
import { AgreeCheck, AuthHeader, RegisterForm, SubmitButton, TypeChoice } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useSsoRegistration } from '../hooks/use-sso-registration';
import { AuthFrame } from './auth-frame';
import { PhoneRow } from './register-common-fields';
import { ReferralField } from './referral-field';

export function SsoNewMember({ data }: { data: Extract<SsoCallback, { status: 'new' }> }) {
  const t = useTranslations('auth');
  const f = useSsoRegistration(data);
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
        selected={f.kind}
        onPick={f.setKind}
      />
      {f.kind ? (
        <RegisterForm>
          <PhoneRow f={f.common} err={f.err} />
          <ReferralField f={f.common} err={f.err} />
          <AgreeCheck checked={f.common.agree} onChange={f.common.setAgree} error={f.err('agree')}>
            {t(f.kind === 'biz' ? 'register.agreeBiz' : 'register.agreePer')}
          </AgreeCheck>
          <SubmitButton disabled={f.busy} onClick={() => void f.submit()}>
            {t('sso.submit')}
          </SubmitButton>
        </RegisterForm>
      ) : null}
    </AuthFrame>
  );
}
