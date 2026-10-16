'use client';

import { registrationRoles } from '@opchub/shared/fixtures';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { registerPersonal } from '../api';
import { useRegisterCommon } from './use-register-common';

/** State + kiểm tra form đăng ký cá nhân (A-18 → A-20) */
export function usePersonalForm(onOtp: (email: string) => void) {
  const t = useTranslations('auth.register');
  const toast = useToast();
  const common = useRegisterCommon();
  const [fullName, setFullName] = useState('');
  const [persona, setPersonaRaw] = useState('');
  const suggested = registrationRoles.find((r) => r.id === persona)?.suggest ?? [];

  /** Chọn vai trò: nếu chưa chọn nhóm nào thì chọn sẵn nhóm gợi ý của vai trò */
  const setPersona = (id: string) => {
    setPersonaRaw(id);
    if (!common.groupIds.length)
      common.setGroupIds(registrationRoles.find((r) => r.id === id)?.suggest ?? []);
  };

  const firstError = () => {
    if (!persona) return t('errPersona');
    if (!common.groupIds.length) return t('errGroups');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(common.email.trim())) return t('errEmail');
    return undefined;
  };

  const submit = async () => {
    const err = firstError();
    if (err) return toast(err);
    const res = await registerPersonal({
      fullName,
      phone: { country: common.phoneCountry, number: common.phone },
      email: common.email.trim(),
      password: common.password,
      persona,
      groupIds: common.groupIds,
    });
    onOtp(res.email);
  };

  return { common, fullName, setFullName, persona, setPersona, suggested, submit };
}

export type PersonalForm = ReturnType<typeof usePersonalForm>;
