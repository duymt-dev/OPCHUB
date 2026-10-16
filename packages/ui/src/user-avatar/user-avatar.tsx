import type { CSSProperties } from 'react';

const PALETTE = ['#1677FF', '#52C41A', '#FF4D4F', '#722ED1', '#FAAD14', '#1F2A44', '#0E8A9A'];

export interface UserAvatarProps {
  name: string;
  size?: number;
  src?: string | undefined;
  color?: string | undefined;
  /** Ghi đè chữ viết tắt (VD admin hệ thống "QT") */
  text?: string | undefined;
  style?: CSSProperties;
}

/** Hai chữ cái cuối của tên, VD "Quản trị hệ thống" → "HT"; "Nguyễn An" → "NA" */
export function initials(name: string): string {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function colorOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? '#1677FF';
}

/** Avatar tròn: ảnh nếu có, ngược lại chữ viết tắt trên nền màu */
export function UserAvatar({ name, size = 36, src, color, text, style }: UserAvatarProps) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
    display: 'block',
    ...style,
  };
  if (src) {
    return <img src={src} alt="" style={{ ...base, objectFit: 'cover' }} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...base,
        background: color ?? colorOf(name),
        color: '#fff',
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text ?? initials(name)}
    </span>
  );
}
