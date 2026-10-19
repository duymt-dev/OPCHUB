'use client';

import { useState } from 'react';
import type { RegisterField } from '../register-validation';

/**
 * Trường chung hai form đăng ký: SĐT, email, mật khẩu, nhóm, đồng ý điều khoản.
 * `clear` xoá lỗi tại ô khi sửa ô đó (BUG-022).
 */
export function useRegisterCommon(clear: (...keys: RegisterField[]) => void = () => undefined) {
  const [phoneCountry, setPhoneCountry] = useState('vn');
  const [phone, setPhoneRaw] = useState('');
  const [email, setEmailRaw] = useState('');
  const [password, setPassword] = useState('');
  const [groupIds, setGroupIdsRaw] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);

  const setPhone = (v: string) => (setPhoneRaw(v), clear('phone'));
  const setEmail = (v: string) => (setEmailRaw(v), clear('email'));
  const setGroupIds = (ids: string[]) => (setGroupIdsRaw(ids), clear('groups'));
  const toggleGroup = (id: string) => {
    setGroupIdsRaw((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
    clear('groups');
  };

  return {
    phoneCountry,
    setPhoneCountry,
    phone,
    setPhone,
    email,
    setEmail,
    password,
    setPassword,
    groupIds,
    setGroupIds,
    toggleGroup,
    agree,
    setAgree,
  };
}

export type RegisterCommon = ReturnType<typeof useRegisterCommon>;
