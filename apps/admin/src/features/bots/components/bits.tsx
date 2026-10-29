'use client';

import styles from './bots.module.css';

/** Công tắc 36×20 của prototype — `button role=switch` để dùng được bằng bàn phím */
export function Switch({
  on,
  label,
  onChange,
  disabled = false,
}: {
  on: boolean;
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.switch}
      onClick={onChange}
    >
      <span className={styles.knob} />
    </button>
  );
}

interface AvatarProps {
  name: string;
  initial: string;
  color: string;
  photo: string | null;
  size: 20 | 24 | 26 | 28 | 30 | 48 | 72;
}

const FONT: Record<AvatarProps['size'], number> = {
  20: 9,
  24: 10,
  26: 11,
  28: 12,
  30: 13,
  48: 20,
  72: 30,
};

/** Ảnh persona hoặc chữ cái đầu trên nền màu */
export function PersonaAvatar({ name, initial, color, photo, size }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        fontSize: FONT[size],
        ...(photo ? { backgroundImage: `url("${photo}")` } : { background: color }),
      }}
    >
      {photo ? null : initial}
    </span>
  );
}
