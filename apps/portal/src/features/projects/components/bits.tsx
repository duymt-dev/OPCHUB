import { UserAvatar } from '@opchub/ui';
import type { ReactNode } from 'react';
import styles from './bits.module.css';

/** Khối nhỏ dùng lại trong màn Dự án: ảnh, tag màu, ô chữ cái, avatar tròn */

const TONE_CLASS: Record<string, string | undefined> = {
  blue: styles.blue,
  green: styles.green,
  amber: styles.amber,
  orange: styles.orange,
  red: styles.red,
  violet: styles.violet,
  rose: styles.rose,
  gray: styles.gray,
};
export const toneClass = (tone: string) => TONE_CLASS[tone] ?? styles.gray ?? '';

/** Ảnh bìa / ảnh mẫu phủ kín khung (D-36: ảnh ngoài, tự host trước go-live) */
export function Pic({ src, className }: { src: string | null; className?: string | undefined }) {
  if (!src) return <span className={`${styles.pic} ${className ?? ''}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh mẫu ngoài
    <img className={`${styles.pic} ${className ?? ''}`} src={src} alt="" />
  );
}

/** Tag viền màu (giai đoạn, trạng thái, loại góp ý) */
export function Tag({
  tone,
  children,
  size = 'md',
  className,
}: {
  tone: string;
  children: ReactNode;
  size?: 'sm' | 'md';
  className?: string | undefined;
}) {
  const cls = `${styles.tag} ${size === 'sm' ? styles.tagSm : ''} ${toneClass(tone)}`;
  return <span className={`${cls} ${className ?? ''}`}>{children}</span>;
}

const MONO_TONE: Record<string, string | undefined> = {
  blue: styles.tBlue,
  rose: styles.tRose,
  green: styles.tGreen,
  amber: styles.tAmber,
  violet: styles.tViolet,
};

/** Ô vuông chữ cái đầu tên dự án theo tông màu */
export function Mono({ name, tone, size }: { name: string; tone: string; size: 36 | 48 | 96 }) {
  const cls = size === 96 ? styles.mono96 : size === 48 ? styles.mono48 : styles.mono36;
  const t = MONO_TONE[tone] ?? styles.tBlue;
  return <span className={`${styles.mono} ${cls} ${t}`}>{name.slice(0, 1)}</span>;
}

/** Avatar tròn: ảnh nếu có; không ảnh → vòng xám như prototype (ảnh lỗi) hoặc chữ viết tắt */
export function Face({ name, src, size }: { name: string; src: string | null; size: number }) {
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- D-36: ảnh mẫu ngoài
      <img className={styles.face} src={src} alt="" width={size} height={size} />
    );
  return <UserAvatar name={name} size={size} color="#1677FF" />;
}

/** Icon nét 1.7 của prototype (viewBox 24) */
export function Stroke({
  size,
  children,
  width = 1.7,
}: {
  size: number;
  children: ReactNode;
  width?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}
