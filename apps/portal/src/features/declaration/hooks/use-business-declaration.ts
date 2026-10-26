'use client';

import type { DeclarationDraft } from '@opchub/shared/api';
import { BIZ_SIZES } from '@opchub/shared/fixtures';
import { useState } from 'react';
import { useTaxLookup } from '@/features/auth';
import { validateBusiness } from '../model';
import { useDeclarationSave } from './use-declaration-save';

export type BizSize = (typeof BIZ_SIZES)[number];
export const isBizSize = (v: string | null | undefined): v is BizSize =>
  BIZ_SIZES.some((s) => s === v);

/**
 * State popup khai báo DN: điền sẵn từ đăng ký (MST coi như đã tra). Q-V4-607-3: tra cứu lỗi
 * (D-40) cũng mở ô tên / ngành để nhập tay, không chặn lưu.
 */
export function useBusinessDeclaration(draft: DeclarationDraft | undefined) {
  const s = useDeclarationSave('business.saved');
  const b = draft?.business ?? null;
  const [companyName, setCompanyRaw] = useState(b?.companyName ?? '');
  const [mainIndustry, setIndustryRaw] = useState(b?.mainIndustry ?? '');
  const [size, setSizeRaw] = useState<BizSize>(isBizSize(b?.size) ? b.size : '1');
  const [province, setProvinceRaw] = useState(b?.province ?? '');
  const [groupIds, setGroupsRaw] = useState<string[]>(draft?.groupIds ?? []);
  const [manual, setManual] = useState(false);
  const lookup = useTaxLookup(
    (r) => {
      setCompanyRaw(r.companyName);
      setIndustryRaw(r.mainIndustry);
      s.clear('company', 'industry');
    },
    { initial: b?.taxCode ?? '', onFail: () => setManual(true) },
  );
  const found = lookup.found || manual;

  const save = () => {
    const bad = validateBusiness({
      tax: lookup.tax,
      found,
      companyName,
      mainIndustry,
      province,
      groupIds,
    });
    if (bad) return s.reject(bad.key, bad.msg);
    void s.submit({
      accountType: 'business',
      taxCode: lookup.tax.trim(),
      companyName: companyName.trim(),
      mainIndustry: mainIndustry.trim(),
      size,
      province: province.trim(),
      groupIds,
    });
  };

  return {
    ...s,
    lookup,
    found,
    autoFilled: lookup.found,
    companyName,
    mainIndustry,
    size,
    province,
    groupIds,
    setTax: (v: string) => (lookup.setTax(v), setManual(false), s.clear('tax')),
    setCompany: (v: string) => (setCompanyRaw(v), s.clear('company')),
    setIndustry: (v: string) => (setIndustryRaw(v), s.clear('industry')),
    setSize: (v: string) => isBizSize(v) && setSizeRaw(v),
    setProvince: (v: string) => (setProvinceRaw(v), s.clear('province')),
    setGroups: (ids: string[]) => (setGroupsRaw(ids), s.clear('groups')),
    save,
  };
}
