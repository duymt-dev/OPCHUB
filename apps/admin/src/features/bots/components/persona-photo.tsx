'use client';

import { IMAGE_ACCEPT } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { initialOf } from '../model';
import { PERSONA_COLORS } from '../types';
import { PersonaAvatar } from './bits';
import f from './form.module.css';

interface Props {
  name: string;
  color: string;
  photo: string | null;
  onColor: (c: string) => void;
  onPhoto: (url: string | null) => void;
  /** Ảnh chọn từ máy — drawer kiểm, xem trước, tải lên storage (NA-26) */
  onFile: (file: File) => void;
}

/** Ảnh persona (presign `persona-avatar`, nén 512px) hoặc màu nền */
export function PersonaPhoto({ name, color, photo, onColor, onPhoto, onFile }: Props) {
  const t = useTranslations('bots.pf');
  const pick = (file: File | undefined) => {
    if (file) onFile(file);
  };
  return (
    <div className={f.photoRow}>
      <PersonaAvatar
        name={name || t('title')}
        initial={initialOf(name)}
        color={color}
        photo={photo}
        size={72}
      />
      <div className={f.photoSide}>
        <div className={f.photoBtns}>
          <label className={f.upload}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </svg>
            {t('upload')}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className={f.fileInput}
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {photo ? (
            <button type="button" className={f.removePhoto} onClick={() => onPhoto(null)}>
              {t('removePhoto')}
            </button>
          ) : null}
        </div>
        <div className={f.colors}>
          <span className={f.colorsLabel}>{t('orColor')}</span>
          {PERSONA_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={f.color}
              style={{ background: c }}
              aria-pressed={color === c}
              aria-label={t('color', { c })}
              onClick={() => onColor(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
