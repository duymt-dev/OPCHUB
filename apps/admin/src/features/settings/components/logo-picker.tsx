'use client';

import { IMAGE_ACCEPT, useImageUpload } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { useUploadImage } from '@/i18n/use-upload-image';
import g from './general-tab.module.css';

/**
 * Logo nền tảng: "Tải ảnh lên" (PNG/JPG/WebP ≤ 5 MB, NA-26 — nén 512px, presign `platform-logo`)
 * / "Gỡ bỏ" về logo mặc định. Logo lưu ngay khi đổi nên chỉ gọi `onChange` khi đã tải xong.
 */
export function LogoPicker({
  url,
  onChange,
  onError,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const uploadImage = useUploadImage();
  const t = useTranslations('settings.general');
  const file = useRef<HTMLInputElement>(null);

  const logo = useImageUpload((f) => uploadImage(f, 'platform-logo'));

  const onFile = (f: File | undefined) => {
    if (!f) return;
    logo.pick(f, {
      previous: url,
      preview: false,
      apply: (u) => u && onChange(u),
      onInvalid: () => onError(t('logoTooLarge')),
      onError: (e) => onError(e instanceof Error ? e.message : t('logoTooLarge')),
    });
  };

  return (
    <div className={g.logoRow}>
      <div className={g.logoBox}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo tải lên (storage) */}
        <img src={url ?? '/opchub-logo.png'} alt="OPC HUB" className={g.logo} />
      </div>
      <div className={g.logoText}>
        <div className={g.logoTitle}>{t('logo')}</div>
        <div className={g.hint}>{t('logoHint')}</div>
        <div className={g.logoBtns}>
          <button
            type="button"
            className={g.upload}
            disabled={logo.uploading}
            onClick={() => file.current?.click()}
          >
            {t('upload')}
          </button>
          <button type="button" className={g.remove} onClick={() => onChange(null)}>
            {t('removeLogo')}
          </button>
          <input
            ref={file}
            type="file"
            hidden
            accept={IMAGE_ACCEPT}
            aria-label={t('upload')}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}
