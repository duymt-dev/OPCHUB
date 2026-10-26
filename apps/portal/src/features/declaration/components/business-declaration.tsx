'use client';

import type { DeclarationDraft } from '@opchub/shared/api';
import { BIZ_SIZES } from '@opchub/shared/fixtures';
import { Field, SizeChoice, TextInput } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useBusinessDeclaration } from '../hooks/use-business-declaration';
import { TaxField } from './tax-field';
import { DeclarationFrame } from './declaration-frame';
import { OpcPicker } from './opc-picker';
import { ProvinceCombo } from './province-combo';
import styles from './declaration.module.css';

/** P-101: popup "Khai báo thông tin doanh nghiệp" — tên / ngành hiện sau khi tra MST (prototype) */
export function BusinessDeclaration({
  name,
  draft,
  onLogout,
}: {
  name: string;
  draft: DeclarationDraft | undefined;
  onLogout: () => void;
}) {
  const t = useTranslations('declaration');
  const tSize = useTranslations('auth.register.sizes');
  const f = useBusinessDeclaration(draft);

  return (
    <DeclarationFrame
      label="Popup · Khai báo doanh nghiệp"
      doneStep={t('steps.rep')}
      currentStep={t('steps.business')}
      title={t('business.title')}
      intro={t('business.intro', { name })}
      busy={f.busy}
      onLogout={onLogout}
      onSave={f.save}
    >
      <div className={styles.bizBody}>
        <TaxField f={f} />
        {f.found ? (
          <Field label={t('business.company')} required error={f.err('company')}>
            <TextInput
              value={f.companyName}
              onValue={f.setCompany}
              placeholder="Công ty TNHH ..."
            />
          </Field>
        ) : (
          <div className={styles.lookupHint}>
            {t('business.lookupHintBefore')}
            <b>{t('business.lookup')}</b>
            {t('business.lookupHintAfter')}
          </div>
        )}
        <div className={styles.bizGrid}>
          {f.found ? (
            <Field
              label={t('business.industry')}
              tag={f.autoFilled ? t('business.autoTag') : undefined}
              full
              error={f.err('industry')}
            >
              <TextInput
                value={f.mainIndustry}
                onValue={f.setIndustry}
                placeholder="Ngành nghề theo đăng ký kinh doanh"
              />
            </Field>
          ) : null}
          <SizeChoice
            label={t('business.size')}
            options={BIZ_SIZES.map((v) => ({ value: v, label: tSize(v) }))}
            value={f.size}
            onValue={f.setSize}
          />
        </div>
        <Field label={t('business.province')} required error={f.err('province')}>
          <ProvinceCombo value={f.province} onValue={f.setProvince} />
        </Field>
        <OpcPicker selected={f.groupIds} onChange={f.setGroups} error={f.err('groups')} />
      </div>
    </DeclarationFrame>
  );
}
