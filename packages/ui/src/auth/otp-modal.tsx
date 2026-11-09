'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../icons';
import styles from './otp-modal.module.css';

export interface OtpLabels {
  title: string;
  descLead: string;
  descTail: string;
  close: string;
  codeLabel: string;
  submit: string;
  noCode: string;
  resend: string;
}

interface OtpModalProps {
  open: boolean;
  email: string;
  code: string;
  error?: string | undefined;
  labels: OtpLabels;
  submitting?: boolean;
  resending?: boolean;
  onCode: (code: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onClose: () => void;
}

const BOXES = [0, 1, 2, 3, 4, 5];

/** A-21: nhập OTP 6 số — ô nhập ẩn phủ lên 6 hộp hiển thị */
export function OtpModal({
  open,
  email,
  code,
  error,
  labels,
  submitting = false,
  resending = false,
  ...on
}: OtpModalProps) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className={styles.mask} />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="otp-title">
        <OtpHeader email={email} labels={labels} onClose={on.onClose} />
        <OtpBoxes
          code={code}
          label={labels.codeLabel}
          submitting={submitting}
          inputRef={input}
          onCode={on.onCode}
          onSubmit={on.onSubmit}
          onClose={on.onClose}
        />
        {error ? (
          <span role="alert" className={styles.error}>
            {error}
          </span>
        ) : null}
        <button
          type="button"
          className={styles.submit}
          data-ready={code.length === 6 && !submitting}
          data-submitting={submitting}
          disabled={code.length !== 6 || submitting}
          onClick={() => {
            if (!submitting && code.length === 6) on.onSubmit();
          }}
        >
          {labels.submit}
        </button>
        <div className={styles.resend}>
          {labels.noCode}
          <button
            type="button"
            className={styles.link}
            disabled={resending || submitting}
            onClick={() => {
              if (!resending && !submitting) on.onResend();
            }}
          >
            {labels.resend}
          </button>
        </div>
      </div>
    </>
  );
}

function OtpHeader({
  email,
  labels,
  onClose,
}: {
  email: string;
  labels: Pick<OtpLabels, 'title' | 'descLead' | 'descTail' | 'close'>;
  onClose: () => void;
}) {
  return (
    <div className={styles.head}>
      <span className={styles.badge}>
        <Icon name="mailBox" size={22} />
      </span>
      <span className={styles.text}>
        <span id="otp-title" className={styles.title}>
          {labels.title}
        </span>
        <span className={styles.desc}>
          {labels.descLead} <b>{email}</b>
          {labels.descTail}
        </span>
      </span>
      <button type="button" className={styles.close} aria-label={labels.close} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function OtpBoxes({
  code,
  label,
  submitting,
  inputRef,
  onCode,
  onSubmit,
  onClose,
}: {
  code: string;
  label: string;
  submitting: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onCode: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <label className={styles.boxes}>
      {BOXES.map((i) => (
        <span key={i} className={styles.box} data-state={boxState(code, i)}>
          {code[i] ?? ''}
        </span>
      ))}
      <input
        ref={inputRef}
        className={styles.hidden}
        aria-label={label}
        value={code}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={submitting}
        onChange={(e) => onCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !submitting && code.length === 6) onSubmit();
          if (e.key === 'Escape') onClose();
        }}
      />
    </label>
  );
}

function boxState(code: string, i: number) {
  if (i === code.length) return 'current';
  return code[i] ? 'filled' : 'empty';
}
