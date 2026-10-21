import type { CSSProperties, SyntheticEvent } from 'react';

const PALETTE = ['#1677FF', '#52C41A', '#FF4D4F', '#722ED1', '#FAAD14', '#1F2A44', '#0E8A9A'];

/** D-36: Ảnh đại diện mặc định tự host khi người dùng chưa cập nhật ảnh */
export const AVATAR_DEFAULT_SRC = '/images/avatar-default.svg';

export interface UserAvatarProps {
  name: string;
  size?: number;
  src?: string | undefined | null;
  color?: string | undefined;
  /** Ghi đè chữ viết tắt (VD admin hệ thống "QT") */
  text?: string | undefined;
  /** Chế độ hiển thị khi chưa có ảnh: mặc định ảnh bóng người 'image' (/images/avatar-default.svg), hoặc chữ 'initials' */
  fallback?: 'image' | 'initials';
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

/** Màu theo tổng mã ký tự của tên — cùng công thức avc() của prototype */
export function colorOf(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return PALETTE[sum % PALETTE.length] ?? '#1677FF';
}

/** Avatar tròn: ảnh nếu có, ngược lại ảnh bóng người mặc định hoặc chữ viết tắt */
export function UserAvatar({
  name,
  size = 36,
  src,
  color,
  text,
  fallback = 'image',
  style,
}: UserAvatarProps) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
    display: 'block',
    ...style,
  };

  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.src.endsWith(AVATAR_DEFAULT_SRC)) {
      img.src = AVATAR_DEFAULT_SRC;
    }
  };

  if (text || fallback === 'initials') {
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

  return (
    <img
      src={src || AVATAR_DEFAULT_SRC}
      alt=""
      onError={onError}
      style={{ ...base, objectFit: 'cover' }}
    />
  );
}
