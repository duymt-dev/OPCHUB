import type { CSSProperties } from 'react';
import styles from './dashboard.module.css';

interface Props {
  src: string | null;
  size: number;
  /** Viền theo trạng thái (lưới LIVE) */
  ring?: string;
}

/** Ảnh đại diện tròn của khối LIVE (ảnh mẫu; thiếu ảnh → nền xám) */
export function Avatar({ src, size, ring }: Props) {
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(ring ? { border: `2.5px solid ${ring}` } : {}),
  };
  return src ? (
    <img className={styles.avatar} src={src} alt="" style={style} />
  ) : (
    <span className={styles.avatar} style={{ ...style, background: '#B8C4D2' }} />
  );
}
