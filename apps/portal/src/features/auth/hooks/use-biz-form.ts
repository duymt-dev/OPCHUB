'use client';

import { TAX_CODE_RE } from '@opchub/shared/api';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { registerBusiness } from '../api';
import { useRegisterCommon } from './use-register-common';
import { useTaxLookup } from './use-tax-lookup';

/** State + kiểm tra form đăng ký doanh nghiệp (A-12 → A-17) */
export function useBizForm(onOtp: (email: string) => void) {
  const t = useTranslations('auth.register');
  const toast = useToast();
  const common = useRegisterCommon();
  const [companyName, setCompanyName] = useState('');
  const [mainIndustry, setMainIndustry] = useState('');
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

  /** Thứ tự báo lỗi giống prototype (A-17) */
  const firstError = () => {
    if (!tax.trim()) return t('errTaxEmpty');
    if (!TAX_CODE_RE.test(tax.trim())) return t('errTax');
    if (!companyName.trim()) return t('errCompany');
    if (!mainIndustry.trim()) return t('errIndustry');
    if (!common.groupIds.length) return t('errGroups');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(common.email.trim())) return t('errEmail');
    return undefined;
  };

  const submit = async () => {
    const err = firstError();
    if (err) return toast(err);
    const res = await registerBusiness({
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
    });
    onOtp(res.email);
  };

  return {
    common,
    ...lookup,
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
