'use client';

import { useEmailChange } from '../hooks/use-email-change';
import { EmailChangeModal } from './email-change-modal';
import { Field, TextInput } from './form-fields';
import styles from './profile.module.css';

interface Props {
  label: string;
  email: string;
  placeholder: string;
  action: string;
}

/**
 * BUG-030: email là tên đăng nhập — ô chỉ đọc + nút "Đổi email" mở hộp OTP gửi tới email mới.
 * Hộp nằm NGOÀI `<label>` của Field (OtpModal không portal — tránh label cướp click/focus).
 */
export function EmailField({ label, email, placeholder, action }: Props) {
  const flow = useEmailChange();
  return (
    <>
      <Field label={label}>
        <div className={styles.emailRow}>
          <TextInput
            type="email"
            value={email}
            placeholder={placeholder}
            readOnly
            onValue={() => undefined}
          />
          <button type="button" className={styles.btn} onClick={flow.open}>
            {action}
          </button>
        </div>
      </Field>
      <EmailChangeModal flow={flow} current={email} />
    </>
  );
}
