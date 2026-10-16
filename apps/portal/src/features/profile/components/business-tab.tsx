'use client';

import { useTranslations } from 'next-intl';
import type { ProfileForm } from '../hooks/use-profile-form';
import type { Profile } from '../types';
import { Field, FormActions, optionsOf, SelectInput, TextInput } from './form-fields';
import styles from './profile.module.css';

interface Props {
  form: ProfileForm;
  business: NonNullable<Profile['business']>;
}

/**
 * P-91: tab "Thông tin doanh nghiệp". D-40: DN đã xác minh → huy hiệu + MST / tên DN khoá;
 * chưa khớp MST → báo "chờ xác minh", vẫn sửa được.
 */
export function BusinessTab({ form, business }: Props) {
  const t = useTranslations('profile');
  const v = form.values;
  const locked = business.verification === 'verified';
  const fields = t.raw('options.fields') as string[];
  const sizes = t.raw('options.sizes') as string[];

  return (
    <>
      <div className={`${styles.notice} ${locked ? '' : styles.noticePending}`} role="note">
        {locked ? t('biz.verified') : t('biz.pending')}
      </div>
      <div className={styles.grid}>
        <Field label={t('biz.taxCode')}>
          <TextInput value={v.taxCode} readOnly={locked} onValue={(x) => form.set('taxCode', x)} />
        </Field>
        <Field label={t('biz.companyName')}>
          <TextInput
            value={v.companyName}
            readOnly={locked}
            onValue={(x) => form.set('companyName', x)}
          />
        </Field>
        <Field label={t('biz.field')}>
          <SelectInput
            value={v.field}
            options={optionsOf(fields, v.field)}
            onValue={(x) => form.set('field', x)}
          />
        </Field>
        <Field label={t('biz.size')}>
          <SelectInput
            value={v.size}
            options={optionsOf(sizes, v.size)}
            onValue={(x) => form.set('size', x)}
          />
        </Field>
        <Field label={t('biz.position')}>
          <TextInput
            value={v.position}
            placeholder={t('biz.positionPh')}
            onValue={(x) => form.set('position', x)}
          />
        </Field>
        <Field label={t('biz.website')}>
          <TextInput
            value={v.website}
            placeholder={t('biz.websitePh')}
            onValue={(x) => form.set('website', x)}
          />
        </Field>
      </div>
      <FormActions
        resetLabel={t('info.reset')}
        saveLabel={t('info.save')}
        busy={form.busy}
        onReset={form.reset}
        onSave={form.save}
      />
    </>
  );
}
