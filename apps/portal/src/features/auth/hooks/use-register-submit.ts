'use client';

import { translateErrors } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormErrors } from '@/lib/use-form-errors';
import {
  REGISTER_FIELD_MAP,
  type RegisterErrors,
  type RegisterField,
} from '../register-validation';

/**
 * Gửi đăng ký có bắt lỗi (BUG-009): kiểm ở client → lỗi tại mọi ô (BUG-022); gọi API → 409/400
 * có `fields` (email/SĐT/MST trùng) → lỗi tại ô, không mở OTP; lỗi khác → toast thông điệp
 * server. Nút gửi khoá khi đang gửi.
 */
export function useRegisterSubmit() {
  const t = useTranslations('auth.register');
  const tc = useTranslations('common.errors');
  const fe = useFormErrors<RegisterField>();
  const [busy, setBusy] = useState(false);

  const run = async (
    errors: RegisterErrors,
    send: () => Promise<{ email: string }>,
    onOtp: (email: string) => void,
  ): Promise<void> => {
    if (busy) return;
    if (fe.check(translateErrors(errors, (e) => t(e)))) return;
    setBusy(true);
    try {
      const res = await send();
      onOtp(res.email);
    } catch (e) {
      fe.fromApi(e, REGISTER_FIELD_MAP, tc('failed'));
    } finally {
      setBusy(false);
    }
  };

  return { err: fe.err, clear: fe.clear, busy, run };
}

export type RegisterSubmit = ReturnType<typeof useRegisterSubmit>;
