'use client';

import { IMAGE_ACCEPT } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { PickFile } from '../../hooks/use-store-media';
import m from './media.module.css';

const PLUS = 'M12 5v14M5 12h14';
const PEN = 'M17 3l4 4L7 21H3v-4z';

export function Svg({ d, size = 22, w = 1.8 }: { d: string; size?: number; w?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** Ô chọn tệp ẩn phủ kín ô cha — mỗi tệp gọi `pick` (nhiều tệp khi `multiple`) */
export function FileInput(p: {
  accept: string;
  multiple?: boolean;
  label: string;
  pick: PickFile;
  apply: (url: string, file: File) => void;
}) {
  return (
    <input
      type="file"
      accept={p.accept}
      multiple={p.multiple ?? false}
      aria-label={p.label}
      className={m.file}
      onChange={(e) => {
        for (const file of Array.from(e.target.files ?? [])) p.pick(file, (u) => p.apply(u, file));
        e.target.value = '';
      }}
    />
  );
}

/** Ô "+ Thêm …" nét đứt (prototype: ảnh / ảnh bìa / video) */
export function AddTile(p: {
  text: string;
  kind: 'logo' | 'cover' | 'square' | 'reel';
  accept?: string;
  multiple?: boolean;
  pick: PickFile;
  apply: (url: string, file: File) => void;
}) {
  const cls = { logo: '', cover: m.addCover, square: m.addSq, reel: m.addReel }[p.kind];
  return (
    <label className={`${m.add} ${cls}`}>
      <Svg d={PLUS} size={p.kind === 'logo' ? 20 : 22} />
      <span>{p.text}</span>
      <FileInput
        accept={p.accept ?? IMAGE_ACCEPT}
        multiple={p.multiple ?? false}
        label={p.text}
        pick={p.pick}
        apply={p.apply}
      />
    </label>
  );
}

/** Ảnh bìa: chọn (viền xanh + ✓), ✎ thay ảnh, × xoá (prototype `st.wz.covers`) */
export function CoverTile(p: {
  src: string;
  on: boolean;
  pick: PickFile;
  onPick: () => void;
  onReplace: (url: string) => void;
  onDelete: () => void;
}) {
  const t = useTranslations('stores.wizard');
  return (
    <div className={`${m.tile} ${m.cover}`} data-on={p.on ? '1' : '0'}>
      <button type="button" className={m.file} aria-label={t('coverPick')} onClick={p.onPick} />
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh người dùng tải lên / ảnh mẫu, không qua next/image */}
      <img src={p.src} alt="" className={m.img} />
      <div className={m.tools}>
        <label className={m.tool} title={t('replace')}>
          <Svg d={PEN} size={12} w={2} />
          <span className={m.srOnly}>{t('replace')}</span>
          <FileInput accept={IMAGE_ACCEPT} label={t('replace')} pick={p.pick} apply={p.onReplace} />
        </label>
        <button type="button" className={m.tool} title={t('removeImage')} onClick={p.onDelete}>
          ×
        </button>
      </div>
      {p.on ? <span className={m.check}>✓</span> : null}
    </div>
  );
}
