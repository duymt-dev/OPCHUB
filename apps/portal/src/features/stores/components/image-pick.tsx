'use client';

import { IMAGE_ACCEPT } from '@opchub/ui';
import type { PickImage } from '../hooks/use-store-images';
import styles from './mine.module.css';

interface Props {
  value: string | null;
  label: string;
  pick: PickImage;
  onChange: (url: string | null) => void;
  /** `cover` 16:10 rộng; `square` ô vuông ảnh sản phẩm */
  shape: 'cover' | 'square';
}

/** Ô chọn 1 ảnh: bấm để chọn tệp, đã có ảnh thì hiện ảnh + nút gỡ */
export function ImagePick({ value, label, pick, onChange, shape }: Props) {
  return (
    <div className={styles.pickRow}>
      <label
        className={`${styles.pick} ${shape === 'square' ? styles.pickSquare : ''}`}
        style={value ? { backgroundImage: `url('${value}')` } : undefined}
      >
        {value ? null : <span className={styles.pickL}>+ {label}</span>}
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          className={styles.hidden}
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file, value, onChange);
            e.target.value = '';
          }}
        />
      </label>
      {value ? (
        <button type="button" className={styles.pickClear} onClick={() => onChange(null)}>
          ×
        </button>
      ) : null}
    </div>
  );
}
