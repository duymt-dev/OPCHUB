'use client';

import { BIZ_SIZES, bizCountries } from '@opchub/shared/fixtures';
import {
  AgreeCheck,
  Field,
  IndustryChips,
  LookupButton,
  RegisterForm,
  SectionTitle,
  SelectInput,
  SubmitButton,
  TextInput,
} from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { BizForm } from '../hooks/use-biz-form';
import { EmailRow, GroupsRow, PasswordRow, PhoneRow } from './register-common-fields';

/** A-12 → A-17: form đăng ký doanh nghiệp */
export function RegisterBizForm({ f }: { f: BizForm }) {
  const t = useTranslations('auth.register');
  return (
    <RegisterForm>
      <SectionTitle>{t('bizSection')}</SectionTitle>
      <Field
        label={t('taxCode')}
        required
        note={f.found ? t('taxFound') : undefined}
        error={f.err('tax')}
      >
        <LookupButton label={t('lookup')} onLookup={f.onLookup}>
          <TextInput value={f.tax} onValue={f.setTax} placeholder={t('taxPlaceholder')} />
        </LookupButton>
      </Field>
      <Field label={t('companyName')} required error={f.err('company')}>
        <TextInput
          value={f.companyName}
          onValue={f.setCompanyName}
          placeholder={t('companyPlaceholder')}
        />
      </Field>
      <IndustryChips
        main={
          <Field
            label={t('mainIndustry')}
            tag={f.found ? t('industryAuto') : undefined}
            full
            error={f.err('industry')}
          >
            <TextInput
              value={f.mainIndustry}
              onValue={f.setMainIndustry}
              placeholder={t('industryPlaceholder')}
            />
          </Field>
        }
        title={t('otherIndustries', { count: f.otherIndustries.length })}
        items={f.otherIndustries}
        removeLabel={(name) => t('removeIndustry', { name })}
        onRemove={f.removeIndustry}
        size={
          <Field label={t('size')}>
            <SelectInput
              value={f.size}
              onValue={f.setSize}
              options={BIZ_SIZES.map((v) => ({ value: v, label: t(`sizes.${v}`) }))}
            />
          </Field>
        }
      />
      <Field label={t('bizCountry')}>
        <SelectInput value={f.country} onValue={f.setCountry} options={bizCountries} />
      </Field>
      <SectionTitle gap>{t('repSection')}</SectionTitle>
      <Field label={t('fullName')} required>
        <TextInput value={f.representative} onValue={f.setRep} placeholder={t('namePlaceholder')} />
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
      <PasswordRow f={f.common} biz />
      <GroupsRow f={f.common} err={f.err} />
      <AgreeCheck checked={f.common.agree} onChange={f.common.setAgree}>
        {t('agreeBiz')}
      </AgreeCheck>
      <SubmitButton disabled={f.busy} onClick={f.submit}>
        {t('submitBiz')}
      </SubmitButton>
    </RegisterForm>
  );
}
