'use client';

import { STORE_LIMITS, type StoreUpsert } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { StoreMedia } from '../../hooks/use-store-media';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import f from './fields.module.css';
import m from './media.module.css';
import { AddTile } from './media-tiles';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
  media: StoreMedia;
}

/** Tiêu đề video = tên tệp bỏ đuôi (prototype `addReel`) */
const titleOf = (name: string) => (name.replace(/\.[^.]+$/, '') || 'Video').slice(0, 120);

/**
 * Bước 2 — "Hình ảnh" (nhiều ảnh, ≤ 12) + "Video & Reels" (9:16, ≤ 6, ≤ 100 MB). `set` đọc bản mới nhất
 * qua hàm cập nhật để nhiều tệp tải song song không ghi đè nhau.
 */
export function StepReels({ draft, set, media }: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <>
      <span className={f.section}>{t('gallery')}</span>
      <span className={`${f.hint} ${f.hintUp}`}>{t('galleryHint')}</span>
      <div className={m.gallery}>
        {draft.gallery.map((src) => (
          <div key={src} className={m.pic}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh storage động */}
            <img src={src} alt="" className={m.img} />
            <button
              type="button"
              className={`${m.x} ${m.xRight}`}
              title={t('removeImage')}
              onClick={() => set((d) => ({ gallery: d.gallery.filter((x) => x !== src) }))}
            >
              ×
            </button>
          </div>
        ))}
        <AddTile
          text={t('addImage')}
          kind="square"
          multiple
          pick={media.gallery}
          apply={(url) =>
            set((d) => ({ gallery: [...d.gallery, url].slice(0, STORE_LIMITS.gallery) }))
          }
        />
      </div>
      <span className={f.section}>{t('reels')}</span>
      <span className={`${f.hint} ${f.hintUp}`}>{t('reelsHint')}</span>
      <div className={m.reels}>
        {draft.videos.map((v) => (
          <div key={v.url} className={m.reel}>
            <video src={v.url} muted playsInline preload="metadata" className={m.video} />
            <span className={m.reelTitle}>{v.title}</span>
            <button
              type="button"
              className={`${m.x} ${m.xRight}`}
              title={t('removeVideo')}
              onClick={() => set((d) => ({ videos: d.videos.filter((x) => x.url !== v.url) }))}
            >
              ×
            </button>
          </div>
        ))}
        <AddTile
          text={t('addVideo')}
          kind="reel"
          accept="video/mp4,video/webm,video/quicktime"
          multiple
          pick={media.video}
          apply={(url, file) =>
            set((d) => ({
              videos: [...d.videos, { url, title: titleOf(file.name) }].slice(
                0,
                STORE_LIMITS.videos,
              ),
            }))
          }
        />
      </div>
    </>
  );
}
