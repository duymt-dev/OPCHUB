import type { CSSProperties } from 'react';

/** Chữ viết tắt theo `ini()` prototype v4: chữ đầu từ đầu + từ cuối, một từ thì 2 ký tự đầu */
export function meInitials(name: string): string {
  const w = (name || '?').trim().split(/\s+/);
  const first = w[0] ?? '?';
  const last = w[w.length - 1] ?? first;
  return (w.length > 1 ? `${first[0] ?? ''}${last[0] ?? ''}` : first.slice(0, 2)).toUpperCase();
}

interface MeAvatarProps {
  name: string;
  size: number;
  src?: string | undefined | null;
  /** Ghi đè chữ + màu (VD admin hệ thống "QT") */
  text?: string | undefined;
  color?: string | undefined;
}

/** Avatar người đang đăng nhập (D-89, prototype `av(sz)`): ảnh nếu có, không thì chữ viết tắt nền #1677FF */
export function MeAvatar({ name, size, src, text, color }: MeAvatarProps) {
  const base: CSSProperties = { width: size, height: size, borderRadius: 999, flexShrink: 0 };
  if (src && !text) {
    return <img src={src} alt="" style={{ ...base, objectFit: 'cover', display: 'block' }} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...base,
        background: color ?? '#1677FF',
        color: '#fff',
        fontSize: Math.round(size * 0.36),
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text ?? meInitials(name)}
    </span>
  );
}
