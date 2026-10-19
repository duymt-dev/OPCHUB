import styles from './setup.module.css';

/** Ô nhập của các màn thiết lập Admin (đổi mật khẩu lần đầu, 2FA, mã TOTP); lỗi hiển thị tại ô */
export function SetupField({
  label,
  value,
  onChange,
  error,
  type = 'password',
  placeholder,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: 'password' | 'text';
  placeholder?: string;
  inputMode?: 'numeric';
  autoComplete?: string;
}) {
  return (
    <label className={styles.field}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`${styles.input} ${error ? styles.inputErr : ''}`}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <span className={styles.err}>{error}</span> : null}
    </label>
  );
}
