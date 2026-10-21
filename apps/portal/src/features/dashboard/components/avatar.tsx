import type { CSSProperties, SyntheticEvent } from 'react';
import styles from './dashboard.module.css';

const AVATAR_DEFAULT_SRC = '/images/avatar-default.svg';

interface Props {
  src: string | null;
  size: number;
  /** Viền theo trạng thái (lưới LIVE) */
  ring?: string;
}

/** Ảnh đại diện tròn của khối LIVE (ảnh mẫu; thiếu ảnh → ảnh bóng người mặc định) */
export function Avatar({ src, size, ring }: Props) {
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(ring ? { border: `2.5px solid ${ring}` } : {}),
  };

  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.src.endsWith(AVATAR_DEFAULT_SRC)) {
      img.src = AVATAR_DEFAULT_SRC;
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh đại diện storage/mặc định tự host
    <img
      className={styles.avatar}
      src={src || AVATAR_DEFAULT_SRC}
      alt=""
      onError={onError}
      style={{ ...style, objectFit: 'cover' }}
    />
  );
}
