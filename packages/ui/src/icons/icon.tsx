import type { CSSProperties } from 'react';
import { ICON_PATHS, type IconName } from './paths';

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}

/** Icon nét (stroke) cùng bộ với prototype — dùng cho nav/header */
export function Icon({
  name,
  size = 16,
  stroke = 'currentColor',
  strokeWidth = 1.7,
  style,
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
