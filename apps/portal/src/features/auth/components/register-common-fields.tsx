'use client';

import { phoneCountries } from '@opchub/shared/fixtures';
import { Field, type FieldErrorProps, PasswordField, PhoneField, TextInput } from '@opchub/ui';
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

/** Mật khẩu v4: DN có * và ô bo 8px; cá nhân nhãn đậm + icon khoá + thanh độ mạnh + gợi ý */
export function PasswordRow({ f, biz }: { f: RegisterCommon; biz?: boolean }) {
  const t = useTranslations('auth');
  return (
    <Field label={t('register.password')} required={biz} strong={!biz}>
      <PasswordField
        value={f.password}
        onValue={f.setPassword}
        placeholder={t('register.passwordPlaceholder')}
        showLabel={t('login.show')}
        hideLabel={t('login.hide')}
        tall={biz ? 'round' : 'square'}
        {...(biz
          ? {}
          : {
              strength: { hint: t('register.passwordHint'), level: passwordStrength(f.password) },
            })}
      />
    </Field>
  );
}
