'use client';

import { ssoProviders } from '@opchub/shared/fixtures';
import { AuthHeader, LegalAndDemo, SsoSection, TypeBanner, TypeChoice } from '@opchub/ui';
import type { RegisterKind } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBizForm } from '../hooks/use-biz-form';
import { useOtpFlow } from '../hooks/use-otp-flow';
import { usePersonalForm } from '../hooks/use-personal-form';
import { useSso } from '../hooks/use-sso';
import { AuthFrame } from './auth-frame';
import { OtpDialog } from './otp-dialog';
import { RegisterBizForm } from './register-biz-form';
import { RegisterPersonalForm } from './register-personal-form';

const parseKind = (v: string | null): RegisterKind | undefined =>
  v === 'biz' || v === 'per' ? v : undefined;

/** A-10 → A-25: đăng ký — chọn loại, form DN / cá nhân, OTP */
export function RegisterScreen() {
  const t = useTranslations('auth');
  const router = useRouter();
  const kind = parseKind(useSearchParams().get('type'));
  const otp = useOtpFlow();
  const biz = useBizForm(otp.open);
  const per = usePersonalForm(otp.open);
  const sso = useSso();
  const setKind = (k?: RegisterKind) => router.push(k ? `/register?type=${k}` : '/register');

  const title = kind
    ? t(kind === 'biz' ? 'register.headBiz' : 'register.headPer')
    : t('register.headChoose');
  return (
    <AuthFrame>
      <AuthHeader
        title={title}
        sub={kind ? t('register.subForm') : t('register.subChoose')}
        tabs={{
          active: 'register',
          loginLabel: t('login.tabLogin'),
          registerLabel: t('login.tabRegister'),
          onLogin: () => router.push('/login'),
        }}
      />
      {kind ? (
        <TypeBanner
          kind={kind}
          title={t(kind === 'biz' ? 'register.bizBanner' : 'register.perBanner')}
          sub={t(kind === 'biz' ? 'register.bizBannerSub' : 'register.perBannerSub')}
          changeLabel={t('register.changeType')}
          onChange={() => setKind()}
        />
      ) : (
        <TypeChoice
          title={t('register.chooseTitle')}
          chooseLabel={t('register.choose')}
          cards={[
            { kind: 'biz', title: t('register.bizCard'), desc: t('register.bizCardDesc') },
            { kind: 'per', title: t('register.perCard'), desc: t('register.perCardDesc') },
          ]}
          onPick={setKind}
        />
      )}
      {kind === 'biz' ? <RegisterBizForm f={biz} /> : null}
      {kind === 'per' ? <RegisterPersonalForm f={per} /> : null}
      {kind === 'per' ? (
        <SsoSection
          label={t('login.orContinue')}
          sso={ssoProviders.map((s) => ({ id: s.id, name: s.name }))}
          onSso={sso}
        />
      ) : null}
      <LegalAndDemo
        labels={{ terms: t('login.terms'), privacy: t('login.privacy'), demoTitle: '' }}
      />
      <OtpDialog flow={otp} />
    </AuthFrame>
  );
}
