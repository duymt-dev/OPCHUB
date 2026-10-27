'use client';

import { provinces } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import { useOptionLabels } from '../hooks/use-option-labels';
import type { ConsultField, ConsultForm } from '../types';
import { type ConsultErr, Pair, PairCell, Row, Section, Select, TextInput } from './form-fields';

interface Props {
  form: ConsultForm;
  set: (k: ConsultField, v: string) => void;
  /** Lỗi tại ô (BUG-022) */
  err: ConsultErr;
}

const PROVINCE_NAMES = provinces.map(([name]) => name);

function City({ form, set, err }: Props) {
  const t = useTranslations('services.form');
  return (
    <Row label={t('city')} required>
      <Select
        form={form}
        name="addr"
        set={set}
        err={err}
        label={t('city')}
        placeholder={t('cityPh')}
        options={PROVINCE_NAMES}
      />
    </Row>
  );
}

/** Biến thể Doanh nghiệp / Tổ chức (P-81) */
export function BizSection({ form, set, err }: Props) {
  const t = useTranslations('services.form');
  const opts = useOptionLabels();
  const f = { form, set, err };
  return (
    <>
      <Section>{t('orgSection')}</Section>
      <Row label={t('org')} required>
        <TextInput {...f} name="org" label={t('org')} placeholder={t('orgPh')} />
      </Row>
      <Row label={t('orgType')} required>
        <Select
          {...f}
          name="orgType"
          label={t('orgType')}
          placeholder={t('orgTypePh')}
          options={opts('orgType')}
        />
      </Row>
      <Row label={t('taxSize')} required>
        <Pair>
          <PairCell>
            <TextInput {...f} name="tax" label={t('taxPh')} placeholder={t('taxPh')} />
          </PairCell>
          <PairCell>
            <Select
              {...f}
              name="size"
              label={t('sizePh')}
              placeholder={t('sizePh')}
              options={opts('size')}
            />
          </PairCell>
        </Pair>
      </Row>
      <City {...f} />
      <Row label={t('web')}>
        <TextInput {...f} name="web" label={t('web')} placeholder="https://" />
      </Row>
      <Section even>{t('contactSection')}</Section>
      <Row label={t('namePos')} required>
        <Pair>
          <PairCell>
            <TextInput {...f} name="name" label={t('name')} placeholder={t('namePh')} />
          </PairCell>
          <PairCell>
            <TextInput {...f} name="pos" label={t('posPh')} placeholder={t('posPh')} />
          </PairCell>
        </Pair>
      </Row>
    </>
  );
}

/** Biến thể Cá nhân (P-80) */
export function PersonalSection({ form, set, err }: Props) {
  const t = useTranslations('services.form');
  const opts = useOptionLabels();
  const f = { form, set, err };
  return (
    <>
      <Section>{t('perSection')}</Section>
      <Row label={t('name')} required>
        <TextInput {...f} name="name" label={t('name')} placeholder={t('namePh')} />
      </Row>
      <Row label={t('job')} required>
        <Select {...f} name="job" label={t('job')} placeholder={t('jobPh')} options={opts('job')} />
      </Row>
      <Row label={t('field')}>
        <TextInput {...f} name="field" label={t('field')} placeholder={t('fieldPh')} />
      </Row>
      <Row label={t('bizSt')}>
        <Select
          {...f}
          name="bizSt"
          label={t('bizSt')}
          placeholder={t('bizStPh')}
          options={opts('bizSt')}
        />
      </Row>
      <City {...f} />
    </>
  );
}

/** Liên hệ + nhu cầu (chung hai biến thể) */
export function ContactAndNeed({ form, set, err }: Props) {
  const t = useTranslations('services.form');
  const opts = useOptionLabels();
  const f = { form, set, err };
  return (
    <>
      <Row label={t('phone')} required>
        <TextInput {...f} name="phone" label={t('phone')} placeholder={t('phonePh')} />
      </Row>
      <Row label={t('email')} required>
        <TextInput {...f} name="email" label={t('email')} placeholder={t('emailPh')} />
      </Row>
      <Section even>{t('needSection')}</Section>
      <Row label={t('whenBudget')}>
        <Pair>
          <Select
            {...f}
            name="when"
            label={t('whenPh')}
            placeholder={t('whenPh')}
            options={opts('when')}
          />
          <Select
            {...f}
            name="budget"
            label={t('budgetPh')}
            placeholder={t('budgetPh')}
            options={opts('budget')}
          />
        </Pair>
      </Row>
    </>
  );
}
