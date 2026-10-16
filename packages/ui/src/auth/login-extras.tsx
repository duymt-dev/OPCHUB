'use client';

import { SsoIcon } from '../icons';
import styles from './login-panel.module.css';
import type { DemoAccountItem, LoginLabels, SsoItem } from './types';

interface SsoSectionProps {
  label: string;
  sso: SsoItem[];
  onSso?: ((id: string) => void) | undefined;
}

/** Vạch "hoặc tiếp tục với" + lưới nút SSO */
export function SsoSection({ label, sso, onSso }: SsoSectionProps) {
  return (
    <>
      <div className={styles.divider}>
        <i />
        {label}
        <i />
      </div>
      <div className={styles.sso}>
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

interface LegalAndDemoProps {
  labels: Pick<LoginLabels, 'terms' | 'privacy' | 'demoTitle'>;
  accounts: DemoAccountItem[];
  onPick: (account: DemoAccountItem) => void;
}

/** Điều khoản/Bảo mật + hộp tài khoản dùng thử (bấm để điền) */
export function LegalAndDemo({ labels, accounts, onPick }: LegalAndDemoProps) {
  return (
    <>
      <div className={styles.legal}>
        <span>{labels.terms}</span>
        <span>{labels.privacy}</span>
      </div>
      <div className={styles.demo}>
        <span className={styles.demoTitle}>{labels.demoTitle}</span>
        {accounts.map((a) => (
          <button key={a.email} type="button" className={styles.demoItem} onClick={() => onPick(a)}>
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
    </>
  );
}
