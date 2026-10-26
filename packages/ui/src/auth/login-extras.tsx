'use client';

import { SsoIcon } from '../icons';
import styles from './login-panel.module.css';
import type { DemoAccountItem, SsoItem } from './types';
import { keepAnchor } from './keep-anchor';

interface SsoSectionProps {
  label: string;
  sso: SsoItem[];
  /** Chưa có danh sách: một ô trống cùng cỡ nút (không nháy nút bị tắt, không dịch bố cục) */
  pending?: boolean;
  onSso?: ((id: string) => void) | undefined;
}

/** Vạch "Hoặc tiếp tục với" + nút SSO một cột (v4: chỉ Google, D-89) */
export function SsoSection({ label, sso, pending = false, onSso }: SsoSectionProps) {
  return (
    <>
      <div className={styles.divider}>
        <i />
        {label}
        <i />
      </div>
      <div className={styles.sso} aria-busy={pending || undefined}>
        {pending && !sso.length ? <span className={styles.ssoHold} aria-hidden="true" /> : null}
        {sso.map((s) => (
          <button key={s.id} type="button" className={styles.ssoBtn} onClick={() => onSso?.(s.id)}>
            <SsoIcon id={s.id} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** "Chưa có tài khoản? Đăng ký tham gia" cuối thẻ đăng nhập */
export function RegisterPrompt({
  text,
  link,
  onRegister,
}: {
  text: string;
  link: string;
  onRegister?: (() => void) | undefined;
}) {
  return (
    <div className={styles.prompt}>
      {text}{' '}
      <button
        type="button"
        className={styles.promptLink}
        onMouseDown={keepAnchor}
        onClick={onRegister}
      >
        {link}
      </button>
    </div>
  );
}

interface DemoAccountsProps {
  title: string;
  /** Trống = ẩn hộp tài khoản dùng thử (D-35: production tắt) */
  accounts?: DemoAccountItem[];
  onPick?: (account: DemoAccountItem) => void;
}

/** Hộp tài khoản dùng thử (bấm để điền) — chỉ bật ở môi trường demo */
export function DemoAccounts({ title, accounts = [], onPick }: DemoAccountsProps) {
  if (!accounts.length) return null;
  return (
    <div className={styles.demo}>
      <span className={styles.demoTitle}>{title}</span>
      {accounts.map((a) => (
        <button key={a.email} type="button" className={styles.demoItem} onClick={() => onPick?.(a)}>
          <span className={styles.demoLabel}>{a.label}</span>
          <span className={styles.demoTag} data-tone={a.tone}>
            {a.tag}
          </span>
          <span className={styles.demoCred}>
            {a.email} · {a.password}
          </span>
        </button>
      ))}
    </div>
  );
}
