'use client';

import type { StoreStatus, StoreUpsert } from '@opchub/shared/api-domains';
import { provinces, STORE_FIELDS } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import type { PickImage } from '../hooks/use-store-images';
import { STORE_AUDIENCE_ORDER } from '../model';
import { ImagePick } from './image-pick';
import styles from './mine.module.css';
import base from './stores.module.css';

type TextKey = 'name' | 'slogan' | 'intro' | 'phone' | 'email' | 'website' | 'address';

interface Props {
  draft: StoreUpsert;
  status: StoreStatus;
  set: (patch: Partial<StoreUpsert>) => void;
  pickCover: PickImage;
}

/** Đối tượng · Ngành nghề (danh mục v4) · Tỉnh / thành (34 tỉnh) */
function MineSelects({ draft, set }: Pick<Props, 'draft' | 'set'>) {
  const t = useTranslations('stores');
  return (
    <>
      <label className={styles.field}>
        {t('mine.audience')}
        <select
          className={styles.input}
          value={draft.audience}
          onChange={(e) => {
            const a = STORE_AUDIENCE_ORDER.find((x) => x === e.target.value);
            if (a) set({ audience: a });
          }}
        >
          {STORE_AUDIENCE_ORDER.map((a) => (
            <option key={a} value={a}>
              {t(`audience.${a}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t('mine.field')}
        <select
          className={styles.input}
          value={draft.field}
          onChange={(e) => set({ field: e.target.value })}
        >
          <option value="">{t('mine.fieldPh')}</option>
          {STORE_FIELDS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {t('mine.province')}
        <select
          className={styles.input}
          value={draft.province}
          onChange={(e) => set({ province: e.target.value })}
        >
          <option value="">{t('mine.provincePh')}</option>
          {provinces.map(([name]) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/** Khối "Thông tin gian hàng" (prototype edit mode, index.html 2050–2064) */
export function MineInfo({ draft, status, set, pickCover }: Props) {
  const t = useTranslations('stores');
  const input = (k: TextKey, opts: { wide?: boolean; ph?: string } = {}) => (
    <label className={`${styles.field} ${opts.wide ? styles.wide : ''}`}>
      {t(`mine.${k}`)}
      <input
        className={styles.input}
        value={draft[k]}
        {...(opts.ph ? { placeholder: opts.ph } : {})}
        onChange={(e) => set({ [k]: e.target.value })}
      />
    </label>
  );
  return (
    <section className={base.card}>
      <div className={base.cardHead}>
        <span className={base.cardTitle}>{t('mine.info')}</span>
        <span className={base.tag} data-status={status}>
          {t(`status.${status}`)}
        </span>
      </div>
      <div className={styles.formGrid}>
        {input('name', { wide: true })}
        {input('slogan', { wide: true, ph: t('mine.sloganPh') })}
        <MineSelects draft={draft} set={set} />
        <label className={`${styles.field} ${styles.wide}`}>
          {t('mine.intro')}
          <textarea
            className={styles.textarea}
            rows={4}
            value={draft.intro}
            placeholder={t('mine.introPh')}
            onChange={(e) => set({ intro: e.target.value })}
          />
        </label>
        <div className={`${styles.field} ${styles.wide}`}>
          <span>{t('mine.cover')}</span>
          <ImagePick
            shape="cover"
            value={draft.coverUrl}
            label={t('mine.coverPick')}
            pick={pickCover}
            onChange={(coverUrl) => set({ coverUrl })}
          />
        </div>
        {input('phone')}
        {input('email')}
        {input('website', { ph: t('mine.websitePh') })}
        {input('address')}
      </div>
    </section>
  );
}
