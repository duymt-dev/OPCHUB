'use client';

import { provinces } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import { ACTIVE_HOURS, AGE_RANGES, PERSONA_TONES, type PersonaForm } from '../types';
import { opts, SelectField, TextField } from './fields';
import f from './form.module.css';

type Setter = <K extends keyof PersonaForm>(k: K) => (v: PersonaForm[K]) => void;

const asGender = (v: string): PersonaForm['gender'] =>
  v === 'Nam' || v === 'Nữ' || v === 'Khác' ? v : '';

/** "THÔNG TIN CƠ BẢN": tên, giới tính, độ tuổi, vai trò, tỉnh, giới thiệu */
export function PersonaBasicFields({ form, set }: { form: PersonaForm; set: Setter }) {
  const t = useTranslations('bots.pf');
  return (
    <>
      <div className={f.section}>{t('basic')}</div>
      <TextField
        label={t('name')}
        value={form.name}
        onChange={set('name')}
        placeholder={t('namePh')}
      />
      <div className={f.two}>
        <SelectField
          label={t('gender')}
          value={form.gender}
          onChange={(v) => set('gender')(asGender(v))}
          options={[
            { value: '', label: t('gender') },
            { value: 'Nam', label: t('male') },
            { value: 'Nữ', label: t('female') },
            { value: 'Khác', label: t('other') },
          ]}
        />
        <SelectField
          label={t('age')}
          value={form.ageRange}
          onChange={set('ageRange')}
          options={[{ value: '', label: t('age') }, ...opts(AGE_RANGES)]}
        />
      </div>
      <div className={f.two}>
        <TextField
          label={t('role')}
          value={form.title}
          onChange={set('title')}
          placeholder={t('rolePh')}
        />
        <SelectField
          label={t('province')}
          value={form.province}
          onChange={set('province')}
          options={[{ value: '', label: t('pick') }, ...opts(provinces.map((p) => p[0]))]}
        />
      </div>
      <label className={f.field}>
        <span className={f.labelRow}>
          {t('bio')}
          <span className={f.counter}>{form.bio.length}/200</span>
        </span>
        <textarea
          className={f.textarea}
          rows={3}
          maxLength={200}
          value={form.bio}
          placeholder={t('bioPh')}
          onChange={(e) => set('bio')(e.target.value)}
        />
      </label>
    </>
  );
}

/** "PHONG CÁCH TƯƠNG TÁC": giọng văn, chuyên môn, tần suất, khung giờ */
export function PersonaStyleFields({ form, set }: { form: PersonaForm; set: Setter }) {
  const t = useTranslations('bots.pf');
  return (
    <>
      <div className={f.section}>{t('style')}</div>
      <div className={f.two}>
        <SelectField
          label={t('tone')}
          value={form.tone}
          onChange={set('tone')}
          options={opts(PERSONA_TONES)}
        />
        <TextField
          label={t('skills')}
          value={form.skills}
          onChange={set('skills')}
          placeholder={t('skillsPh')}
        />
      </div>
      <div className={f.two}>
        <TextField
          label={t('freq')}
          type="number"
          min={1}
          max={20}
          value={form.postsPerDay}
          onChange={set('postsPerDay')}
        />
        <SelectField
          label={t('hours')}
          value={form.activeHours}
          onChange={set('activeHours')}
          options={opts(ACTIVE_HOURS)}
        />
      </div>
    </>
  );
}
