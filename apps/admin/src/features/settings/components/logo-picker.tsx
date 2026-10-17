'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import g from './general-tab.module.css';

const LOGO_MAX = 2 * 1024 * 1024;
const LOGO_ACCEPT = 'image/png,image/svg+xml,image/jpeg,image/webp';

/** Logo nền tảng: "Tải ảnh lên" (PNG/SVG ≤ 2 MB) / "Gỡ bỏ" về logo mặc định */
export function LogoPicker({
  url,
  onChange,
  onError,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations('settings.general');
  const file = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > LOGO_MAX || !LOGO_ACCEPT.split(',').includes(f.type))
      return onError(t('logoTooLarge'));
    const r = new FileReader();
    // Q-G6a-3: chờ UPLOAD_KINDS 'platform-logo' (presigned URL); tạm gửi data URL
    r.onload = () => typeof r.result === 'string' && onChange(r.result);
    r.readAsDataURL(f);
  };

  return (
    <div className={g.logoRow}>
      <div className={g.logoBox}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logo tải lên (data URL / CDN) */}
        <img src={url ?? '/opchub-logo.png'} alt="OPC HUB" className={g.logo} />
      </div>
      <div className={g.logoText}>
        <div className={g.logoTitle}>{t('logo')}</div>
        <div className={g.hint}>{t('logoHint')}</div>
        <div className={g.logoBtns}>
          <button type="button" className={g.upload} onClick={() => file.current?.click()}>
            {t('upload')}
          </button>
          <button type="button" className={g.remove} onClick={() => onChange(null)}>
            {t('removeLogo')}
          </button>
          <input
            ref={file}
            type="file"
            hidden
            accept={LOGO_ACCEPT}
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
