'use client';

import { registrationRoles } from '@opchub/shared/fixtures';
import { AgreeCheck, Field, RegisterForm, RolePicker, SubmitButton, TextInput } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { PersonalForm } from '../hooks/use-personal-form';
import { EmailRow, GroupsRow, PasswordRow, PhoneRow } from './register-common-fields';

/** A-18 → A-20: form đăng ký cá nhân */
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
      <PhoneRow f={f.common} />
      <EmailRow f={f.common} />
      <PasswordRow f={f.common} />
      <RolePicker
        title={t('personaTitle')}
        roles={registrationRoles}
        value={f.persona}
        onChange={f.setPersona}
      />
      <GroupsRow f={f.common} suggested={f.suggested} />
      <AgreeCheck checked={f.common.agree} onChange={f.common.setAgree}>
        {t('agreePer')}
      </AgreeCheck>
      <SubmitButton onClick={() => void f.submit()}>{t('submitPer')}</SubmitButton>
    </RegisterForm>
  );
}
