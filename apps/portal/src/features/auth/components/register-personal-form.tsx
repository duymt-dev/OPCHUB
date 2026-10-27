'use client';

import { AgreeCheck, Field, RegisterForm, SubmitButton, TextInput } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { PersonalForm } from '../hooks/use-personal-form';
import { EmailRow, PasswordRow, PhoneRow } from './register-common-fields';
import { ReferralField } from './referral-field';

/** A-18: form đăng ký cá nhân v4 (D-89) — vai trò + nhóm khai báo sau đăng nhập */
export function RegisterPersonalForm({ f }: { f: PersonalForm }) {
  const t = useTranslations('auth.register');
  return (
    <RegisterForm>
      <Field label={t('fullName')}>
        <TextInput
          value={f.fullName}
          onValue={f.setFullName}
          autoComplete="name"
          placeholder={t('namePlaceholder')}
        />
      </Field>
      <PhoneRow f={f.common} err={f.err} />
      <EmailRow f={f.common} err={f.err} />
      <ReferralField f={f.common} err={f.err} />
      <PasswordRow f={f.common} />
      <AgreeCheck checked={f.common.agree} onChange={f.common.setAgree} error={f.err('agree')}>
        {t('agreePer')}
      </AgreeCheck>
      <SubmitButton disabled={f.busy} onClick={f.submit}>
        {t('submitPer')}
      </SubmitButton>
    </RegisterForm>
  );
}
