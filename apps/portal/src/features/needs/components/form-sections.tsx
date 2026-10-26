'use client';

import {
  NEED_CHANNELS,
  NEED_COOPERATION,
  NEED_FIELD_OTHER,
  NEED_SCOPES,
  NEED_STANDARDS,
  NEED_TYPES,
} from '@opchub/shared/api-domains';
import { provinces, STORE_FIELDS } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import { type NeedDraft, toggleIn } from '../model';
import { Chips, Label, Section, TextField } from './form-bits';
import styles from './form.module.css';

export interface SectionProps {
  d: NeedDraft;
  set: (patch: Partial<NeedDraft>) => void;
}

const asOptions = <T extends string>(list: readonly T[]) => list.map((k) => ({ key: k, label: k }));

/** 1. Thông tin nhu cầu */
export function InfoSection({ d, set }: SectionProps) {
  const t = useTranslations('needs');
  return (
    <Section n={1} title={t('form.s1')} hint={t('form.s1Hint')}>
      <Chips
        label={t('form.type')}
        required
        options={NEED_TYPES.map((k) => ({ key: k, label: t(`type.${k}`) }))}
        isOn={(k) => d.type === k}
        onPick={(type) => set({ type })}
      />
      <TextField
        label={t('form.needTitle')}
        required
        value={d.title}
        placeholder={t('form.needTitlePh')}
        onChange={(title) => set({ title })}
      />
      <div className={styles.grid}>
        <label className={styles.field}>
          <Label text={t('form.field')} required />
          <select
            className={styles.input}
            value={d.field}
            onChange={(e) => set({ field: e.target.value })}
          >
            <option value="">{t('form.fieldPh')}</option>
            {STORE_FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value={NEED_FIELD_OTHER}>{t('form.fieldOther')}</option>
          </select>
        </label>
        {d.field === NEED_FIELD_OTHER ? (
          <TextField
            label={t('form.fieldCustom')}
            required
            accent
            value={d.fieldCustom}
            placeholder={t('form.fieldCustomPh')}
            onChange={(fieldCustom) => set({ fieldCustom })}
          />
        ) : null}
      </div>
      <label className={styles.field}>
        <Label text={t('form.desc')} required />
        <textarea
          className={styles.textarea}
          rows={4}
          value={d.description}
          placeholder={t('form.descPh')}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
    </Section>
  );
}

/** 2. Quy mô & ngân sách — "Thỏa thuận" ẩn hai ô Từ / Đến như prototype */
export function ScaleSection({ d, set }: SectionProps) {
  const t = useTranslations('needs.form');
  return (
    <Section n={2} title={t('s2')} hint={t('s2Hint')}>
      <div className={styles.grid}>
        <TextField
          label={t('qty')}
          value={d.qty}
          placeholder={t('qtyPh')}
          onChange={(qty) => set({ qty })}
        />
        <TextField
          label={t('unit')}
          value={d.unit}
          placeholder={t('unitPh')}
          onChange={(unit) => set({ unit })}
        />
      </div>
      <div className={styles.field}>
        {t('budget')}
        <div className={styles.budget}>
          {d.negotiable ? null : (
            <>
              <input
                className={styles.input}
                inputMode="numeric"
                value={d.budgetMin}
                placeholder={t('from')}
                aria-label={t('from')}
                onChange={(e) => set({ budgetMin: e.target.value })}
              />
              <span className={styles.dash}>–</span>
              <input
                className={styles.input}
                inputMode="numeric"
                value={d.budgetMax}
                placeholder={t('to')}
                aria-label={t('to')}
                onChange={(e) => set({ budgetMax: e.target.value })}
              />
            </>
          )}
          <button
            type="button"
            className={styles.check}
            aria-pressed={d.negotiable}
            onClick={() => set({ negotiable: !d.negotiable })}
          >
            <span className={`${styles.box} ${d.negotiable ? styles.boxOn : ''}`}>
              {d.negotiable ? '✓' : ''}
            </span>
            {t('negotiable')}
          </button>
        </div>
      </div>
    </Section>
  );
}

/** 3. Khu vực & thời hạn — tỉnh chọn từ danh mục 34 tỉnh/thành (lọc + gợi ý cùng tỉnh) */
export function AreaSection({ d, set }: SectionProps) {
  const t = useTranslations('needs.form');
  return (
    <Section n={3} title={t('s3')} hint={t('s3Hint')}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <Label text={t('province')} />
          <select
            className={styles.input}
            value={d.province}
            onChange={(e) => set({ province: e.target.value })}
          >
            {provinces.map(([name]) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <TextField label={t('ward')} value={d.ward} onChange={(ward) => set({ ward })} />
        <TextField
          label={t('dueDate')}
          type="date"
          value={d.dueDate}
          onChange={(dueDate) => set({ dueDate })}
        />
      </div>
      <Chips
        label={t('scope')}
        options={NEED_SCOPES.map((k) => ({ key: k, label: t(`scopes.${k}`) }))}
        isOn={(k) => d.scope === k}
        onPick={(scope) => set({ scope })}
      />
    </Section>
  );
}

/** 4. Yêu cầu & hình thức hợp tác (chọn nhiều) */
export function TermsSection({ d, set }: SectionProps) {
  const t = useTranslations('needs.form');
  return (
    <Section n={4} title={t('s4')} hint={t('s4Hint')}>
      <Chips
        label={t('cooperation')}
        multi
        options={asOptions(NEED_COOPERATION)}
        isOn={(k) => d.cooperation.includes(k)}
        onPick={(k) => set({ cooperation: toggleIn(d.cooperation, k) })}
      />
      <Chips
        label={t('standards')}
        multi
        options={asOptions(NEED_STANDARDS)}
        isOn={(k) => d.standards.includes(k)}
        onPick={(k) => set({ standards: toggleIn(d.standards, k) })}
      />
      <TextField
        label={t('doc')}
        type="url"
        value={d.docUrl}
        placeholder={t('docPh')}
        onChange={(docUrl) => set({ docUrl })}
      />
    </Section>
  );
}

/** 5. Thông tin liên hệ — cần SĐT hoặc email (server kiểm lại) */
export function ContactSection({ d, set }: SectionProps) {
  const t = useTranslations('needs.form');
  return (
    <Section n={5} title={t('s5')} hint={t('s5Hint')}>
      <div className={styles.grid}>
        <TextField
          label={t('contactName')}
          value={d.contactName}
          onChange={(contactName) => set({ contactName })}
        />
        <TextField
          label={t('phone')}
          required
          type="tel"
          value={d.phone}
          onChange={(phone) => set({ phone })}
        />
        <TextField
          label={t('email')}
          type="email"
          value={d.email}
          onChange={(email) => set({ email })}
        />
      </div>
      <Chips
        label={t('channel')}
        options={NEED_CHANNELS.map((k) => ({ key: k, label: t(`channels.${k}`) }))}
        isOn={(k) => d.channel === k}
        onPick={(channel) => set({ channel })}
      />
    </Section>
  );
}
