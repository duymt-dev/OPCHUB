'use client';

import { provinces, regionOf } from '@opchub/shared/fixtures';
import { FieldErrorOf, type FieldErrorProps, invalidProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { nameForProvince } from '../model';
import type { GroupField, GroupFormState, Person } from '../types';
import styles from './group-form.module.css';

export type FormPatch = (patch: Partial<GroupFormState>) => void;

interface Props {
  f: GroupFormState;
  set: FormPatch;
}

/** Lỗi tại ô (BUG-022) */
type Err = { err: (k: GroupField) => FieldErrorProps | undefined };

const Req = () => <span className={styles.req}>*</span>;

/** Ảnh bìa (tỉ lệ 2:1) — xem DV-G4c-3 về lưu ảnh khi chưa có storage */
export function CoverField({ f, set, onFile }: Props & { onFile: (file: File) => void }) {
  const t = useTranslations('groups.form');
  return (
    <div className={styles.field}>
      {t('cover')}
      {f.coverUrl ? (
        <div className={styles.coverBox}>
          <img className={styles.coverImg} src={f.coverUrl} alt="" />
          <button type="button" className={styles.coverRm} onClick={() => set({ coverUrl: null })}>
            {t('coverRemove')}
          </button>
        </div>
      ) : (
        <label className={styles.upload}>
          <span className={styles.uploadPlus}>+</span>
          <span className={styles.uploadText}>{t('coverUpload')}</span>
          <span className={styles.uploadHint}>{t('coverRatio')}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={styles.hidden}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
      )}
    </div>
  );
}

function PrivacyField({ f, set }: Props) {
  const t = useTranslations('groups.form');
  return (
    <div className={styles.field}>
      {t('privacy')}
      <div className={styles.privs} role="radiogroup" aria-label={t('privacy')}>
        {[false, true].map((ap) => {
          const on = f.approval === ap;
          return (
            <button
              key={String(ap)}
              type="button"
              role="radio"
              aria-checked={on}
              className={`${styles.priv} ${on ? styles.privOn : ''}`}
              onClick={() => set({ approval: ap })}
            >
              <i className={styles.dot}>
                <i />
              </i>
              <span className={styles.privText}>
                <span className={styles.privLabel}>{ap ? t('approval') : t('public')}</span>
                <span className={styles.hint}>{ap ? t('approvalDesc') : t('publicDesc')}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BasicFields({ f, set, err }: Props & Err) {
  const t = useTranslations('groups.form');
  return (
    <>
      <div className={styles.nameRow}>
        <label className={styles.field}>
          <span>
            <Req /> {t('name')}
          </span>
          <input
            className={styles.input}
            value={f.name}
            placeholder={t('namePh')}
            {...invalidProps(err('name'))}
            onChange={(e) => set({ name: e.target.value })}
          />
          <FieldErrorOf e={err('name')} />
        </label>
        <label className={styles.field}>
          <span>
            <Req /> {t('province')}
          </span>
          <select
            className={styles.select}
            value={f.province}
            {...invalidProps(err('province'))}
            onChange={(e) =>
              set({ province: e.target.value, name: nameForProvince(f.name, e.target.value) })
            }
          >
            <option value="">{t('provincePh')}</option>
            {provinces.map(([p]) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <FieldErrorOf e={err('province')} />
          <span className={styles.hint}>
            {f.province ? t('region', { region: regionOf(f.province) }) : t('regionAll')}
          </span>
        </label>
      </div>
      <label className={styles.field} aria-label={t('desc')}>
        <span className={styles.split}>
          <span>
            <Req /> {t('desc')}
          </span>
          <span className={styles.hint}>{f.description.length}/200</span>
        </span>
        <textarea
          rows={3}
          maxLength={200}
          className={styles.textarea}
          value={f.description}
          placeholder={t('descPh')}
          {...invalidProps(err('description'))}
          onChange={(e) => set({ description: e.target.value })}
        />
        <FieldErrorOf e={err('description')} />
      </label>
      <PrivacyField f={f} set={set} />
    </>
  );
}

export function PeopleFields({ f, set, people, err }: Props & Err & { people: Person[] }) {
  const t = useTranslations('groups.form');
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;
  return (
    <div className={styles.twoCol}>
      <label className={styles.field}>
        <span>
          <Req /> {t('owner')}
        </span>
        <select
          className={styles.select}
          value={f.ownerId}
          {...invalidProps(err('ownerId'))}
          onChange={(e) => set({ ownerId: e.target.value })}
        >
          <option value="">{t('ownerPh')}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <FieldErrorOf e={err('ownerId')} />
        <span className={styles.hint}>{t('ownerHint')}</span>
      </label>
      <label className={styles.field}>
        {t('lecturers')}
        <select
          className={styles.select}
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id && !f.lecturerIds.includes(id)) set({ lecturerIds: [...f.lecturerIds, id] });
          }}
        >
          <option value="">{t('lecturersPh')}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className={styles.chips}>
          {f.lecturerIds.map((id) => (
            <span key={id} className={styles.chip}>
              {nameOf(id)}
              <button
                type="button"
                className={styles.chipX}
                aria-label={t('removeLecturer', { name: nameOf(id) })}
                onClick={() => set({ lecturerIds: f.lecturerIds.filter((x) => x !== id) })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </label>
    </div>
  );
}
