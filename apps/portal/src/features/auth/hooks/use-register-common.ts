'use client';

import { useState } from 'react';

/** Trường chung hai form đăng ký: SĐT, email, mật khẩu, nhóm, đồng ý điều khoản */
export function useRegisterCommon() {
  const [phoneCountry, setPhoneCountry] = useState('vn');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);

  const toggleGroup = (id: string) =>
    setGroupIds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

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
