'use client';

import { useTranslations } from 'next-intl';
import { mapEmbedOf, mapLinkOf } from '../model';
import type { EventFormState, FormMode } from '../types';
import styles from './event-form.module.css';

type Set = (p: Partial<EventFormState>) => void;
interface FieldProps {
  f: EventFormState;
  set: Set;
}

const MODES: { key: FormMode; label: string }[] = [
  { key: 'offline', label: 'Offline' },
  { key: 'online', label: 'Online' },
];

function Req({ children }: { children: string }) {
  return (
    <span>
      <span className={styles.req}>*</span> {children}
    </span>
  );
}

/** Ảnh bìa 16:9 */
export function CoverField({ f, set, onFile }: FieldProps & { onFile: (file: File) => void }) {
  const t = useTranslations('events.form');
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
            className={styles.file}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

/** Tên, hình thức, ngày + giờ bắt đầu / kết thúc */
export function BasicFields({ f, set }: FieldProps) {
  const t = useTranslations('events.form');
  return (
    <>
      <label className={styles.field}>
        <Req>{t('name')}</Req>
        <input
          className={styles.input}
          value={f.title}
          placeholder={t('namePh')}
          onChange={(e) => set({ title: e.target.value })}
        />
      </label>
      <div className={styles.field}>
        {t('mode')}
        <div className={styles.seg} role="radiogroup" aria-label={t('mode')}>
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={f.mode === m.key}
              className={`${styles.segItem} ${f.mode === m.key ? styles.segOn : ''}`}
              onClick={() => set({ mode: m.key })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.when}>
        <label className={styles.field}>
          <Req>{t('date')}</Req>
          <input
            type="date"
            className={styles.input}
            value={f.date}
            onChange={(e) => set({ date: e.target.value })}
          />
          <span className={styles.hint}>
            {f.id && !f.date ? t('dateHint', { day: f.currentDay }) : ''}
          </span>
        </label>
        <label className={styles.field}>
          {t('start')}
          <input
            type="time"
            className={styles.input}
            value={f.start}
            onChange={(e) => set({ start: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          {t('end')}
          <input
            type="time"
            className={styles.input}
            value={f.end}
            onChange={(e) => set({ end: e.target.value })}
          />
        </label>
      </div>
    </>
  );
}

/** Offline: khối địa điểm + bản đồ; Online: link tham gia */
export function PlaceFields({ f, set }: FieldProps) {
  const t = useTranslations('events.form');
  if (f.mode === 'online')
    return (
      <label className={styles.field}>
        <Req>{t('link')}</Req>
        <input
          className={styles.input}
          value={f.place}
          placeholder={t('linkPh')}
          onChange={(e) => set({ place: e.target.value })}
        />
      </label>
    );
  const addr = f.address.trim();
  return (
    <div className={styles.venue}>
      <span className={styles.venueTitle}>{t('venue')}</span>
      <label className={styles.field}>
        <Req>{t('place')}</Req>
        <input
          className={styles.input}
          value={f.place}
          placeholder={t('placePh')}
          onChange={(e) => set({ place: e.target.value })}
        />
      </label>
      <label className={styles.field}>
        <Req>{t('address')}</Req>
        <input
          className={styles.input}
          value={f.address}
          placeholder={t('addressPh')}
          onChange={(e) => set({ address: e.target.value })}
        />
      </label>
      <label className={styles.field}>
        {t('map')}
        <div className={styles.mapRow}>
          <input
            className={styles.input}
            value={f.mapUrl}
            placeholder={t('mapPh')}
            onChange={(e) => set({ mapUrl: e.target.value })}
          />
          <a
            className={styles.mapTry}
            href={mapLinkOf(f)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('mapTry')}
          </a>
        </div>
        <span className={styles.hint}>{t('mapHint')}</span>
      </label>
      {addr ? (
        <div className={styles.map}>
          {addr.length > 8 ? (
            <iframe
              className={styles.mapFrame}
              title={t('mapPreview')}
              src={mapEmbedOf(addr)}
              loading="lazy"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Số chỗ + nhóm tổ chức */
export function SeatsFields({
  f,
  set,
  groups,
}: FieldProps & { groups: { id: string; name: string }[] }) {
  const t = useTranslations('events.form');
  return (
    <div className={styles.pair}>
      <label className={styles.field}>
        {t('seats')}
        <input
          type="number"
          min={1}
          className={styles.input}
          value={f.seats}
          onChange={(e) => set({ seats: e.target.value })}
        />
      </label>
      <label className={styles.field}>
        {t('group')}
        <select
          className={styles.input}
          value={f.groupId}
          onChange={(e) => set({ groupId: e.target.value })}
        >
          <option value="">{t('groupAll')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Công tắc "Mở đăng ký" */
export function RegSwitch({ f, set }: FieldProps) {
  const t = useTranslations('events.form');
  return (
    <button
      type="button"
      role="switch"
      aria-checked={f.registrationOpen}
      className={styles.switchRow}
      onClick={() => set({ registrationOpen: !f.registrationOpen })}
    >
      <span className={styles.switchText}>
        <span className={styles.switchTitle}>{t('regOpen')}</span>
        <span className={styles.hint}>{t('regOpenHint')}</span>
      </span>
      <span className={`${styles.switch} ${f.registrationOpen ? styles.switchOn : ''}`}>
        <span className={styles.knob} />
      </span>
    </button>
  );
}
