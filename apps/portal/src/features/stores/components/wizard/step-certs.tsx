'use client';

import { STORE_LIMITS, type StoreUpsert } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { StoreMedia } from '../../hooks/use-store-media';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import f from './fields.module.css';
import m from './media.module.css';
import { FileInput } from './media-tiles';
import p from './profile.module.css';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
  media: StoreMedia;
}

const EMPTY = { name: '', org: '', imageUrl: '' };
const IMG_PATH = 'M4 16l4-4 3 3 5-5 4 4M4 4h16v16H4z';

/** Ảnh 3:4 bắt buộc + Tên chứng nhận * + Đơn vị cấp + "+ Thêm giấy chứng nhận" */
function CertForm({ set, media }: Props) {
  const t = useTranslations('stores.wizard');
  const toast = useToast();
  const [v, setV] = useState(EMPTY);
  const add = () => {
    if (!v.name.trim()) return toast(t('needCertName'));
    if (!v.imageUrl) return toast(t('needCertImage'));
    const c = { name: v.name.trim(), org: v.org.trim(), imageUrl: v.imageUrl };
    set((d) => ({ certs: [...d.certs, c].slice(0, STORE_LIMITS.certs) }));
    setV(EMPTY);
  };
  return (
    <div className={p.certForm}>
      {v.imageUrl ? (
        <div className={p.certImg}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh chứng nhận storage động */}
          <img src={v.imageUrl} alt="" className={p.contain} />
          <button
            type="button"
            className={`${m.x} ${m.xRight}`}
            onClick={() => setV({ ...v, imageUrl: '' })}
          >
            ×
          </button>
        </div>
      ) : (
        <label className={p.certPick}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={IMG_PATH} />
          </svg>
          <span>
            {t('certImage')}
            <span className={f.req}> *</span>
          </span>
          <FileInput
            accept="image/png,image/jpeg,image/webp"
            label={t('certImage')}
            pick={media.cert}
            apply={(url) => setV((x) => ({ ...x, imageUrl: url }))}
          />
        </label>
      )}
      <div className={p.certFields}>
        <input
          className={f.input}
          value={v.name}
          placeholder={t('certName')}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
        <input
          className={f.input}
          value={v.org}
          placeholder={t('certOrg')}
          onChange={(e) => setV({ ...v, org: e.target.value })}
        />
        <button type="button" className={`${f.dashed} ${f.dashed36}`} onClick={add}>
          {t('addCert')}
        </button>
      </div>
    </div>
  );
}

/** Thẻ ảnh + tên + đơn vị (trống → "Chứng nhận") có × */
function CertList({ draft, set }: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <div className={p.certList}>
      {draft.certs.map((c, i) => (
        <div key={`${c.imageUrl}-${i}`} className={p.cert}>
          <div className={p.certThumb}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh chứng nhận storage động */}
            <img src={c.imageUrl} alt="" className={p.contain} />
          </div>
          <b className={p.certName}>{c.name}</b>
          <span className={p.certOrg}>{c.org || t('certDefault')}</span>
          <button
            type="button"
            className={`${m.x} ${p.certX}`}
            title={t('remove')}
            onClick={() => set((d) => ({ certs: d.certs.filter((_, j) => j !== i) }))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Giấy chứng nhận (prototype :2071 → 2081) */
export function StepCerts(props: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <>
      <span className={f.section}>{t('certs')}</span>
      <span className={`${f.hint} ${f.hintUp}`}>{t('certsHint')}</span>
      <CertForm {...props} />
      <CertList {...props} />
    </>
  );
}
