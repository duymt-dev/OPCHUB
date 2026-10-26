'use client';

import { useState } from 'react';
import type { RegisterField } from '../register-validation';
import { useReferralCode } from './use-referral-code';

/**
 * Trường chung hai form đăng ký v4: SĐT, email, mã giới thiệu, mật khẩu, đồng ý điều khoản.
 * `clear` xoá lỗi tại ô khi sửa ô đó (BUG-022).
 */
export function useRegisterCommon(
  clear: (...keys: RegisterField[]) => void = () => undefined,
  initialEmail = '',
) {
  const [phoneCountry, setPhoneCountry] = useState('vn');
  const [phone, setPhoneRaw] = useState('');
  const [email, setEmailRaw] = useState(initialEmail);
  const referral = useReferralCode(email, () => clear('referralCode'));
  const [password, setPassword] = useState('');
  const [agree, setAgreeRaw] = useState(false);

  const setPhone = (v: string) => (setPhoneRaw(v), clear('phone'));
  const setEmail = (v: string) => (setEmailRaw(v), clear('email', 'referralCode'));
  const setAgree = (v: boolean) => (setAgreeRaw(v), clear('agree'));

  return {
    referral,
    phoneCountry,
    setPhoneCountry,
    phone,
    setPhone,
    email,
    setEmail,
    password,
    setPassword,
    agree,
    setAgree,
  };
}

export type RegisterCommon = ReturnType<typeof useRegisterCommon>;
