'use client';

import { useState } from 'react';
import styles from './forgot-panel.module.css';
import { keepAnchor } from './keep-anchor';

export interface ForgotLabels {
  back: string;
  title: string;
  sub: string;
  email: string;
  submit: string;
  sentTitle: string;
  sentLead: string;
  sentTail: string;
  toLogin: string;
  resend: string;
}

interface ForgotPanelProps {
  labels: ForgotLabels;
  defaultEmail?: string;
  /** Email đã gửi liên kết; có giá trị → hiện khối "Đã gửi email" */
  sentTo?: string | undefined;
  error?: string | undefined;
  onSubmit: (email: string) => void;
  onBack: () => void;
}

/** A-26/A-27: quên mật khẩu (form) và trạng thái đã gửi */
export function ForgotPanel({ labels, defaultEmail = '', sentTo, error, ...on }: ForgotPanelProps) {
  const [email, setEmail] = useState(defaultEmail);
  return (
    <>
      <button type="button" className={styles.back} onMouseDown={keepAnchor} onClick={on.onBack}>
        {labels.back}
      </button>
      {sentTo ? (
        <>
          <div className={styles.sent} role="status">
            <div className={styles.sentTitle}>{labels.sentTitle}</div>
            <div className={styles.sentText}>
              {labels.sentLead} <b>{sentTo}</b>
              {labels.sentTail}
            </div>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onMouseDown={keepAnchor}
              onClick={on.onBack}
            >
              {labels.toLogin}
            </button>
            <button type="button" className={styles.ghost} onClick={() => on.onSubmit(sentTo)}>
              {labels.resend}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>{labels.title}</h1>
            <div className={styles.sub}>{labels.sub}</div>
          </div>
          <label className={styles.field}>
            {labels.email}
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error ? (
            <div role="alert" className={styles.error}>
              {error}
            </div>
          ) : null}
          <button type="button" className={styles.submit} onClick={() => on.onSubmit(email)}>
            {labels.submit}
          </button>
        </>
      )}
    </>
  );
}
