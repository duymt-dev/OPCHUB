'use client';

import { registrationRoles } from '@opchub/shared/fixtures';
import { useState } from 'react';
import { registerPersonal } from '../api';
import { validatePersonal } from '../register-validation';
import { useRegisterCommon } from './use-register-common';
import { useRegisterSubmit } from './use-register-submit';

/** State + kiểm tra form đăng ký cá nhân (A-18 → A-20); lỗi tại ô (BUG-022, BUG-009) */
export function usePersonalForm(onOtp: (email: string) => void) {
  const sub = useRegisterSubmit();
  const common = useRegisterCommon(sub.clear);
  const [fullName, setFullName] = useState('');
  const [persona, setPersonaRaw] = useState('');
  const suggested = registrationRoles.find((r) => r.id === persona)?.suggest ?? [];

  /** Chọn vai trò: nếu chưa chọn nhóm nào thì chọn sẵn nhóm gợi ý của vai trò */
  const setPersona = (id: string) => {
    setPersonaRaw(id);
    sub.clear('persona');
    if (!common.groupIds.length)
      common.setGroupIds(registrationRoles.find((r) => r.id === id)?.suggest ?? []);
  };

  /** Handler nút gửi: `run` tự bắt mọi lỗi API (BUG-009) — không còn promise bị nuốt */
  const submit = () =>
    void sub.run(
      validatePersonal({
        persona,
        groupIds: common.groupIds,
        email: common.email,
        agree: common.agree,
      }),
      () =>
        registerPersonal({
          fullName,
          phone: { country: common.phoneCountry, number: common.phone },
          email: common.email.trim(),
          password: common.password,
          persona,
          groupIds: common.groupIds,
          agreeTerms: true,
          ...(common.referral.code ? { referralCode: common.referral.code } : {}),
        }),
      onOtp,
      common.referral,
    );

  return {
    common,
    fullName,
    setFullName,
    persona,
    setPersona,
    suggested,
    submit,
    err: sub.err,
    busy: sub.busy,
  };
}

export type PersonalForm = ReturnType<typeof usePersonalForm>;
