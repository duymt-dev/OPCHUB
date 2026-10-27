'use client';

import { AgreeCheck, Field, RegisterForm, SectionTitle, SubmitButton, TextInput } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { BizForm } from '../hooks/use-biz-form';
import { EmailRow, PasswordRow, PhoneRow } from './register-common-fields';
import { ReferralField } from './referral-field';

/** A-12: form đăng ký doanh nghiệp v4 (D-89) — người đại diện + liên hệ */
export function RegisterBizForm({ f }: { f: BizForm }) {
  const t = useTranslations('auth.register');
  return (
    <RegisterForm>
      <SectionTitle gap>{t('repSection')}</SectionTitle>
      <Field label={t('fullName')} required error={f.err('rep')}>
        <TextInput
          value={f.representative}
          onValue={f.setRep}
          autoComplete="name"
          placeholder={t('namePlaceholder')}
        />
      </Field>
      <Field label={t('position')}>
        <TextInput
          value={f.position}
          onValue={f.setPosition}
          placeholder={t('positionPlaceholder')}
        />
      </Field>
      <PhoneRow f={f.common} err={f.err} />
      <EmailRow f={f.common} err={f.err} biz />
      <ReferralField f={f.common} err={f.err} />
      <PasswordRow f={f.common} biz />
      <AgreeCheck checked={f.common.agree} onChange={f.common.setAgree} error={f.err('agree')}>
        {t('agreeBiz')}
      </AgreeCheck>
      <SubmitButton disabled={f.busy} onClick={f.submit}>
        {t('submitBiz')}
      </SubmitButton>
    </RegisterForm>
  );
}
