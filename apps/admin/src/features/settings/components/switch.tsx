import ui from './settings.module.css';
import styles from './switch.module.css';

type Size = 'lg' | 'md' | 'sm';

/** Hình công tắc (chỉ vẽ) — đặt trong phần tử đã có role=switch */
export function SwitchMark({ on, size = 'lg' }: { on: boolean; size?: Size }) {
  return (
    <span className={`${styles.sw} ${styles[size]} ${on ? styles.on : ''}`} aria-hidden>
      <span className={styles.knob} />
    </span>
  );
}

/** Công tắc độc lập: button role=switch */
export function Switch({
  on,
  label,
  title,
  size = 'lg',
  disabled = false,
  onChange,
}: {
  on: boolean;
  label: string;
  title?: string;
  size?: Size;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title}
      disabled={disabled}
      className={styles.btn}
      onClick={() => onChange(!on)}
    >
      <SwitchMark on={on} size={size} />
    </button>
  );
}

/** Dòng tuỳ chọn (nhãn + mô tả + công tắc) bấm cả dòng — prototype stToggles / stSec */
export function OptionRow({
  label,
  desc,
  on,
  disabled = false,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className={ui.optRow}
      onClick={() => onChange(!on)}
    >
      <span className={ui.optText}>
        <span className={ui.optLabel}>{label}</span>
        <span className={ui.optDesc}>{desc}</span>
      </span>
      <SwitchMark on={on} />
    </button>
  );
}
