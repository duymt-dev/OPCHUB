'use client';

import { useState } from 'react';
import { registerBusiness } from '../api';
import { validateBusiness } from '../register-validation';
import { useRegisterCommon } from './use-register-common';
import { useRegisterSubmit } from './use-register-submit';
import { useTaxLookup } from './use-tax-lookup';

/** State + kiểm tra form đăng ký doanh nghiệp (A-12 → A-17); lỗi tại ô (BUG-022, BUG-009) */
export function useBizForm(onOtp: (email: string) => void) {
  const sub = useRegisterSubmit();
  const common = useRegisterCommon(sub.clear);
  const [companyName, setCompanyNameRaw] = useState('');
  const [mainIndustry, setMainIndustryRaw] = useState('');
  const setCompanyName = (v: string) => (setCompanyNameRaw(v), sub.clear('company'));
  const setMainIndustry = (v: string) => (setMainIndustryRaw(v), sub.clear('industry'));
  const [otherIndustries, setOther] = useState<string[]>([]);
  const [size, setSize] = useState('1');
  const [country, setCountry] = useState('vn');
  const [representative, setRep] = useState('');
  const [position, setPosition] = useState('');
  const lookup = useTaxLookup((r) => {
    setCompanyName(r.companyName);
    setRep(r.representative);
    setMainIndustry(r.mainIndustry);
    setOther(r.otherIndustries);
  });
  const { tax } = lookup;

  /** Handler nút gửi: `run` tự bắt mọi lỗi API (BUG-009) — không còn promise bị nuốt */
  const submit = () =>
    void sub.run(
      validateBusiness({
        tax,
        companyName,
        mainIndustry,
        groupIds: common.groupIds,
        email: common.email,
      }),
      () =>
        registerBusiness({
          taxCode: tax.trim(),
          companyName,
          mainIndustry,
          otherIndustries,
          size,
          country,
          representative,
          position,
          phone: { country: common.phoneCountry, number: common.phone },
          email: common.email.trim(),
          password: common.password,
          groupIds: common.groupIds,
        }),
      onOtp,
    );

  return {
    common,
    ...lookup,
    setTax: (v: string) => (lookup.setTax(v), sub.clear('tax')),
    err: sub.err,
    busy: sub.busy,
    companyName,
    setCompanyName,
    mainIndustry,
    setMainIndustry,
    otherIndustries,
    removeIndustry: (i: number) => setOther((o) => o.filter((_, j) => j !== i)),
    size,
    setSize,
    country,
    setCountry,
    representative,
    setRep,
    position,
    setPosition,
    submit,
  };
}

export type BizForm = ReturnType<typeof useBizForm>;
