'use client';

import { phoneCountries, registrationRoles } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import type { ProfileForm } from '../hooks/use-profile-form';
import { EmailField } from './email-field';
import { Field, FormActions, optionsOf, SelectInput, TextInput } from './form-fields';
import styles from './profile.module.css';

const CC_OPTIONS = phoneCountries.map((c) => ({
  value: c.id,
  label: `${c.id.toUpperCase()} ${c.dial}`,
}));
const COUNTRY_OPTIONS = phoneCountries.map((c) => ({ value: c.id, label: c.name }));
const PERSONAS = registrationRoles.map((r) => r.label);

/** P-89 / P-90: tab "Thông tin cá nhân" */
export function InfoTab({ form, isBiz }: { form: ProfileForm; isBiz: boolean }) {
  const t = useTranslations('profile.info');
  const v = form.values;
  const personas = isBiz ? [t('personaBiz')] : PERSONAS;

  return (
    <>
      <div className={styles.grid}>
        <Field label={t('fullName')}>
          <TextInput
            value={v.fullName}
            placeholder={t('fullNamePh')}
            onValue={(x) => form.set('fullName', x)}
          />
        </Field>
        <EmailField
          label={t('email')}
          email={v.email}
          placeholder={t('emailPh')}
          action={t('changeEmail')}
        />
        <Field label={t('phone')}>
          <div className={styles.phone}>
            <SelectInput
              className={styles.cc}
              ariaLabel={t('phoneCountry')}
              value={v.phoneCountry}
              options={CC_OPTIONS}
              onValue={(x) => form.set('phoneCountry', x)}
            />
            <input
              className={styles.phoneInput}
              value={v.phoneNumber}
              placeholder={t('phonePh')}
              onChange={(e) => form.set('phoneNumber', e.target.value)}
            />
          </div>
        </Field>
        <Field label={t('persona')}>
          <SelectInput
            value={v.persona}
            options={optionsOf(personas, v.persona)}
            onValue={(x) => form.set('persona', x)}
          />
        </Field>
        <Field label={t('country')}>
          <SelectInput
            value={v.country}
            options={COUNTRY_OPTIONS}
            onValue={(x) => form.set('country', x)}
          />
        </Field>
        <Field label={t('city')}>
          <TextInput
            value={v.city}
            placeholder={t('cityPh')}
            onValue={(x) => form.set('city', x)}
          />
        </Field>
      </div>
      <Field label={t('bio')}>
        <textarea
          className={styles.textarea}
          rows={4}
          value={v.bio}
          placeholder={t('bioPh')}
          onChange={(e) => form.set('bio', e.target.value)}
        />
      </Field>
      <FormActions
        resetLabel={t('reset')}
        saveLabel={t('save')}
        busy={form.busy}
        onReset={form.reset}
        onSave={form.save}
      />
    </>
  );
}
