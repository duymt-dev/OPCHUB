'use client';

import { Modal, OtpModal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { EmailChange } from '../hooks/use-email-change';
import { Field, TextInput } from './form-fields';
import styles from './profile.module.css';

const OTP_KEYS = [
  'title',
  'descLead',
  'descTail',
  'close',
  'codeLabel',
  'submit',
  'noCode',
  'resend',
] as const;

/**
 * BUG-030: hộp đổi email đăng nhập — bước 1 nhập email mới, bước 2 nhập OTP gửi tới email mới
 * (dùng `OtpModal` chung với đăng ký).
 */
export function EmailChangeModal({ flow, current }: { flow: EmailChange; current: string }) {
  const t = useTranslations('profile.emailChange');
  const labels = Object.fromEntries(OTP_KEYS.map((k) => [k, t(`otp.${k}`)])) as Record<
    (typeof OTP_KEYS)[number],
    string
  >;

  return (
    <>
      <Modal
        open={flow.step === 'email'}
        title={t('title')}
        size="small"
        closeLabel={t('cancel')}
        onClose={flow.close}
        footer={
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={flow.close}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={flow.busy}
              onClick={flow.sendCode}
            >
              {t('send')}
            </button>
          </div>
        }
      >
        <div className={styles.emailChange}>
          <span className={styles.emailHint}>{t('hint', { email: current })}</span>
          <Field label={t('newEmail')}>
            <TextInput
              type="email"
              value={flow.newEmail}
              placeholder={t('newEmailPh')}
              onValue={flow.setNewEmail}
            />
          </Field>
          {flow.error ? (
            <span role="alert" className={styles.emailError}>
              {flow.error}
            </span>
          ) : null}
        </div>
      </Modal>
      <OtpModal
        open={flow.step === 'otp'}
        email={flow.newEmail.trim()}
        code={flow.code}
        error={flow.error}
        submitting={flow.busy}
        labels={labels}
        onCode={flow.setCode}
        onSubmit={flow.submit}
        onResend={flow.resend}
        onClose={flow.close}
      />
    </>
  );
}
