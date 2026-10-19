'use client';

import { phoneCountries, registerGroups } from '@opchub/shared/fixtures';
import {
  Field,
  type FieldErrorProps,
  GroupPicker,
  PasswordField,
  PhoneField,
  TextInput,
} from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { RegisterCommon } from '../hooks/use-register-common';
import type { RegisterField } from '../register-validation';
import { passwordStrength } from '../password-strength';

/** Lỗi tại ô của form đăng ký (BUG-022) */
export type RegErr = (k: RegisterField) => FieldErrorProps | undefined;

/** Ô số điện thoại có chọn mã quốc gia */
export function PhoneRow({ f, err }: { f: RegisterCommon; err?: RegErr }) {
  const t = useTranslations('auth.register');
  return (
    <Field label={t('phone')} error={err?.('phone')}>
      <PhoneField
        countries={phoneCountries}
        country={f.phoneCountry}
        number={f.phone}
        placeholder={t('phonePlaceholder')}
        countryLabel={t('phoneCountry')}
        onCountry={f.setPhoneCountry}
        onNumber={f.setPhone}
      />
    </Field>
  );
}

export function EmailRow({ f, err, biz }: { f: RegisterCommon; err?: RegErr; biz?: boolean }) {
  const t = useTranslations('auth.register');
  return (
    <Field label={biz ? t('companyEmail') : t('email')} required={biz} error={err?.('email')}>
      <TextInput
        type="email"
        autoComplete="email"
        value={f.email}
        onValue={f.setEmail}
        placeholder={biz ? t('companyEmailPlaceholder') : t('emailPlaceholder')}
      />
    </Field>
  );
}

/** Mật khẩu; form cá nhân có thanh độ mạnh + gợi ý */
export function PasswordRow({ f, biz }: { f: RegisterCommon; biz?: boolean }) {
  const t = useTranslations('auth');
  return (
    <Field label={t('register.password')} required={biz}>
      <PasswordField
        value={f.password}
        onValue={f.setPassword}
        placeholder={t('register.passwordPlaceholder')}
        showLabel={t('login.show')}
        hideLabel={t('login.hide')}
        {...(biz
          ? {}
          : {
              strength: { hint: t('register.passwordHint'), level: passwordStrength(f.password) },
            })}
      />
    </Field>
  );
}

export function GroupsRow({
  f,
  err,
  suggested = [],
}: {
  f: RegisterCommon;
  err?: RegErr;
  suggested?: string[];
}) {
  const t = useTranslations('auth.register');
  return (
    <GroupPicker
      title={t('groupsTitle')}
      countLabel={t('groupsCount', { count: f.groupIds.length })}
      hint={t('groupsHint')}
      suggestedLabel={t('suggested')}
      groups={registerGroups}
      selected={f.groupIds}
      suggested={suggested}
      onToggle={f.toggleGroup}
      error={err?.('groups')}
    />
  );
}
