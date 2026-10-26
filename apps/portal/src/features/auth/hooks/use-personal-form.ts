'use client';

import { useState } from 'react';
import { registerPersonal } from '../api';
import { validatePersonal } from '../register-validation';
import { useRegisterCommon } from './use-register-common';
import { useRegisterSubmit } from './use-register-submit';

/**
 * State + kiểm tra form đăng ký cá nhân v4 (A-18, D-89); lỗi tại ô (BUG-022, BUG-009).
 * Vai trò + nhóm khai báo ở popup sau đăng nhập (V4-607).
 */
export function usePersonalForm(onOtp: (email: string) => void) {
  const sub = useRegisterSubmit();
  const common = useRegisterCommon(sub.clear);
  const [fullName, setFullName] = useState('');

  /** Handler nút gửi: `run` tự bắt mọi lỗi API (BUG-009) — không còn promise bị nuốt */
  const submit = () =>
    void sub.run(
      validatePersonal({ email: common.email, agree: common.agree }),
      () =>
        registerPersonal({
          fullName,
          phone: { country: common.phoneCountry, number: common.phone },
          email: common.email.trim(),
          password: common.password,
          agreeTerms: true,
          ...(common.referral.code ? { referralCode: common.referral.code } : {}),
        }),
      onOtp,
      common.referral,
    );

  return { common, fullName, setFullName, submit, err: sub.err, busy: sub.busy };
}

export type PersonalForm = ReturnType<typeof usePersonalForm>;
