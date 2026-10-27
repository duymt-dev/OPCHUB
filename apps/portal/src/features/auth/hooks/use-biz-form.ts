'use client';

import { useState } from 'react';
import { registerBusiness } from '../api';
import { validateBusiness } from '../register-validation';
import { useRegisterCommon } from './use-register-common';
import { useRegisterSubmit } from './use-register-submit';

/**
 * State + kiểm tra form đăng ký DN v4 (A-12, D-89): người đại diện + liên hệ; MST / tên DN /
 * ngành / quy mô / nhóm khai báo ở popup sau đăng nhập (V4-607). Lỗi tại ô (BUG-022, BUG-009).
 */
export function useBizForm(onOtp: (email: string) => void) {
  const sub = useRegisterSubmit();
  const common = useRegisterCommon(sub.clear);
  const [representative, setRepRaw] = useState('');
  const [position, setPosition] = useState('');
  const setRep = (v: string) => (setRepRaw(v), sub.clear('rep'));

  /** Handler nút gửi: `run` tự bắt mọi lỗi API (BUG-009) — không còn promise bị nuốt */
  const submit = () =>
    void sub.run(
      validateBusiness({ representative, email: common.email, agree: common.agree }),
      () =>
        registerBusiness({
          representative: representative.trim(),
          position: position.trim(),
          phone: { country: common.phoneCountry, number: common.phone },
          email: common.email.trim(),
          password: common.password,
          agreeTerms: true,
          ...(common.referral.code ? { referralCode: common.referral.code } : {}),
        }),
      onOtp,
      common.referral,
    );

  return {
    common,
    err: sub.err,
    busy: sub.busy,
    representative,
    setRep,
    position,
    setPosition,
    submit,
  };
}

export type BizForm = ReturnType<typeof useBizForm>;
