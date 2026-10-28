'use client';

import { STORE_INTRO_MIN, STORE_LIMITS, type StoreUpsert } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { StoreMedia } from '../../hooks/use-store-media';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import { coverChoices, removeCover, replaceCover, storeInitials } from '../../model';
import f from './fields.module.css';
import m from './media.module.css';
import { AddTile, CoverTile } from './media-tiles';
import { Field, Label } from './step-info';
import { StepReels } from './step-reels';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
  media: StoreMedia;
}

/** Ảnh đại diện (logo): ô "Chữ viết tắt" + ảnh đã tải, bấm chọn, × xoá (× ảnh đang chọn → chữ viết tắt) */
function Logos({ draft, set, media }: Props) {
  const t = useTranslations('stores.wizard');
  const add = (url: string) =>
    set({ logos: [...draft.logos, url].slice(-STORE_LIMITS.logos), logoUrl: url });
  return (
    <div className={f.field}>
      <span>{t('logo')}</span>
      <div className={m.logos}>
        <button
          type="button"
          className={`${m.tile} ${m.ini}`}
          data-on={draft.logoUrl ? '0' : '1'}
          onClick={() => set({ logoUrl: null })}
        >
          <b className={m.iniText}>{storeInitials(draft.name || 'DN')}</b>
          <span className={m.iniSub}>{t('initials')}</span>
          {draft.logoUrl ? null : <span className={m.check}>✓</span>}
        </button>
        {draft.logos.map((src) => (
          <div key={src} className={m.tile} data-on={draft.logoUrl === src ? '1' : '0'}>
            <button type="button" className={m.file} onClick={() => set({ logoUrl: src })} />
            {/* eslint-disable-next-line @next/next/no-img-element -- logo storage động */}
            <img src={src} alt="" className={m.img} />
            <button
              type="button"
              className={m.x}
              title={t('removeImage')}
              onClick={() =>
                set({
                  logos: draft.logos.filter((x) => x !== src),
                  logoUrl: draft.logoUrl === src ? null : draft.logoUrl,
                })
              }
            >
              ×
            </button>
            {draft.logoUrl === src ? <span className={m.check}>✓</span> : null}
          </div>
        ))}
        <AddTile text={t('addImage')} kind="logo" multiple pick={media.logo} apply={add} />
      </div>
      <span className={f.hint}>{t('logoHint')}</span>
    </div>
  );
}

/** Ảnh bìa *: ảnh tải lên + 6 ảnh mẫu chưa ẩn; × ảnh mẫu → ẩn, × ảnh đang dùng → ảnh còn lại đầu tiên */
function Covers({ draft, set, media }: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <div className={f.field}>
      <Label text={t('cover')} req />
      <div className={m.covers}>
        {coverChoices(draft).map((src) => (
          <CoverTile
            key={src}
            src={src}
            on={draft.coverUrl === src}
            pick={media.cover}
            onPick={() => set({ coverUrl: src })}
            onReplace={(url) => set(replaceCover(draft, src, url))}
            onDelete={() => set(removeCover(draft, src))}
          />
        ))}
        <AddTile
          text={t('addCover')}
          kind="cover"
          pick={media.cover}
          apply={(url) => set({ covers: [url, ...draft.covers], coverUrl: url })}
        />
      </div>
      <span className={f.hint}>{t('coverHint')}</span>
    </div>
  );
}

/** Bước 2 "Giới thiệu & hình ảnh" (prototype :2036 → 2060) */
export function StepMedia(p: Props) {
  const t = useTranslations('stores.wizard');
  const { draft, set } = p;
  const len = draft.intro.trim().length;
  return (
    <>
      <span className={f.h}>{t('steps.2')}</span>
      <Logos {...p} />
      <Covers {...p} />
      <Field label={t('intro')} req>
        <textarea
          className={f.textarea}
          rows={6}
          value={draft.intro}
          placeholder={t('introPh')}
          onChange={(e) => set({ intro: e.target.value })}
        />
        <span className={f.count} data-ok={len >= STORE_INTRO_MIN ? '1' : '0'}>
          {t('introLen', { n: len })}
        </span>
      </Field>
      <span className={f.section}>{t('visionMission')}</span>
      <div className={f.grid200}>
        <Field label={t('vision')}>
          <textarea
            className={f.textarea}
            rows={3}
            value={draft.vision}
            placeholder={t('visionPh')}
            onChange={(e) => set({ vision: e.target.value })}
          />
        </Field>
        <Field label={t('mission')}>
          <textarea
            className={f.textarea}
            rows={3}
            value={draft.mission}
            placeholder={t('missionPh')}
            onChange={(e) => set({ mission: e.target.value })}
          />
        </Field>
      </div>
      <StepReels {...p} />
    </>
  );
}
