import type { ReactNode } from 'react';

/** Icon riêng màn Auth v4 (nhiều phần tử, không vừa một `path` của `Icon`) */

interface SvgProps {
  size: number;
  stroke: string;
  width?: number;
  children: ReactNode;
}

function Svg({ size, stroke, width = 1.8, children }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

const INK = 'rgba(0,0,0,0.88)';
const FIELD = '#5B6B85';

export function HeadsetIcon() {
  return (
    <Svg size={22} stroke="#fff">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19c0 1.5-2 2.5-5 2.5" />
    </Svg>
  );
}

export type AuthValueIcon = 'learn' | 'people' | 'supply' | 'globe';

/** 4 giá trị cột trái (học tập, kết nối, chuỗi cung ứng, quốc tế) */
export function ValueIcon({ name }: { name: AuthValueIcon }) {
  return (
    <Svg size={26} stroke={INK}>
      {name === 'learn' ? (
        <>
          <path d="M2 9.5L12 4l10 5.5-10 5.5z" />
          <path d="M6 11.7V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.3" />
          <path d="M22 9.5V15" />
        </>
      ) : name === 'people' ? (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M6.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="4.8" cy="10" r="2" />
          <path d="M1.5 17.5a3.6 3.6 0 0 1 4.6-3.4" />
          <circle cx="19.2" cy="10" r="2" />
          <path d="M22.5 17.5a3.6 3.6 0 0 0-4.6-3.4" />
        </>
      ) : name === 'supply' ? (
        <>
          <rect x="2" y="9" width="10" height="8" rx="1" />
          <path d="M12 11.5h4.5l3 3V17h-7.5" />
          <circle cx="6" cy="18" r="1.8" />
          <circle cx="17" cy="18" r="1.8" />
          <path d="M5 5.5h6M8 3v5" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" />
        </>
      )}
    </Svg>
  );
}

export function FieldMailIcon() {
  return (
    <Svg size={22} stroke={FIELD} width={1.6}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </Svg>
  );
}

export function FieldLockIcon() {
  return (
    <Svg size={22} stroke={FIELD} width={1.6}>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.3" fill={FIELD} />
    </Svg>
  );
}

/** Mắt gạch chéo (prototype dùng một hình cho cả hai trạng thái) */
export function EyeOffIcon() {
  return (
    <Svg size={22} stroke={FIELD} width={1.6}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 20L20 4" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 20, stroke = '#fff' }: { size?: number; stroke?: string }) {
  return (
    <Svg size={size} stroke={stroke} width={2}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </Svg>
  );
}

/** Cờ EU (prototype vẽ SVG, không dùng ảnh) */
export function EuFlag() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return { x: 15 + 6 * Math.sin(a), y: 10 - 6 * Math.cos(a) };
  });
  return (
    <svg width="30" height="20" viewBox="0 0 30 20" style={{ display: 'block' }} aria-hidden="true">
      <rect width="30" height="20" fill="#003399" />
      <g fill="#FFCC00">
        {stars.map((s) => (
          <circle key={`${s.x.toFixed(2)}-${s.y.toFixed(2)}`} cx={s.x} cy={s.y} r="0.9" />
        ))}
      </g>
    </svg>
  );
}
