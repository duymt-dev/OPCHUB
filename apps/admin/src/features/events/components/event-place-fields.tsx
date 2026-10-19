'use client';

import { FieldErrorOf, invalidProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { MEET_NEW_URL, mapEmbedOf, mapLinkOf } from '../model';
import styles from './event-form.module.css';
import { type FieldProps, Req } from './event-form-fields';

/** Offline: khối địa điểm + bản đồ; Online: link tham gia */
export function PlaceFields({ f, set, err }: FieldProps) {
  const t = useTranslations('events.form');
  if (f.mode === 'online')
    return (
      <label className={styles.field}>
        <Req>{t('link')}</Req>
        <input
          className={styles.input}
          value={f.place}
          placeholder={t('linkPh')}
          {...invalidProps(err('place'))}
          onChange={(e) => set({ place: e.target.value })}
        />
        <FieldErrorOf e={err('place')} />
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
          {...invalidProps(err('place'))}
          onChange={(e) => set({ place: e.target.value })}
        />
        <FieldErrorOf e={err('place')} />
      </label>
      <label className={styles.field}>
        <Req>{t('address')}</Req>
        <input
          className={styles.input}
          value={f.address}
          placeholder={t('addressPh')}
          {...invalidProps(err('address'))}
          onChange={(e) => set({ address: e.target.value })}
        />
        <FieldErrorOf e={err('address')} />
      </label>
      <label className={styles.field}>
        {t('map')}
        <div className={styles.mapRow}>
          <input
            className={styles.input}
            value={f.mapUrl}
            placeholder={t('mapPh')}
            {...invalidProps(err('map'))}
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
        <FieldErrorOf e={err('map')} />
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

/**
 * EV-R01: link Google Meet (cả Online lẫn Offline có phát trực tuyến). Không tích hợp API Google:
 * "Tạo link Meet" mở meet.google.com/new ở tab mới, Admin dán link phòng vào ô.
 */
export function MeetField({ f, set, err }: FieldProps) {
  const t = useTranslations('events.form');
  return (
    <label className={styles.field}>
      <span>
        {t('meet')} <span className={styles.hint}>{t('meetHint')}</span>
      </span>
      <div className={styles.mapRow}>
        <input
          className={styles.input}
          value={f.meet}
          placeholder={t('meetPh')}
          {...invalidProps(err('meet'))}
          onChange={(e) => set({ meet: e.target.value })}
        />
        <button
          type="button"
          className={styles.mapTry}
          onClick={() => window.open(MEET_NEW_URL, '_blank', 'noopener')}
        >
          {t('meetNew')}
        </button>
      </div>
      <FieldErrorOf e={err('meet')} />
    </label>
  );
}
