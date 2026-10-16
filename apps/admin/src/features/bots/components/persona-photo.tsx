'use client';

import { useTranslations } from 'next-intl';
import { initialOf } from '../model';
import { PERSONA_COLORS } from '../types';
import { PersonaAvatar } from './bits';
import f from './form.module.css';

const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface Props {
  name: string;
  color: string;
  photo: string | null;
  onColor: (c: string) => void;
  onPhoto: (url: string | null) => void;
  onInvalid: () => void;
}

/**
 * Ảnh persona hoặc màu nền. Ảnh đọc thành data URL ≤ 5 MB (như DV-G3b-3) cho tới khi
 * `POST /uploads/presign` nhận loại `persona-avatar` (Q-G4d-2).
 */
export function PersonaPhoto({ name, color, photo, onColor, onPhoto, onInvalid }: Props) {
  const t = useTranslations('bots.pf');
  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!OK_TYPES.includes(file.type) || file.size > MAX_BYTES) return onInvalid();
    const r = new FileReader();
    r.onload = () => typeof r.result === 'string' && onPhoto(r.result);
    r.readAsDataURL(file);
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
              accept="image/png,image/jpeg,image/webp"
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
