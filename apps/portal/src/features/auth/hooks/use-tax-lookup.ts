'use client';

import { TAX_CODE_RE } from '@opchub/shared/api';
import type { BizLookup } from '@opchub/shared/api';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { lookupBiz } from '../api';

/** Gõ đủ MST hợp lệ thì tự tra sau 400ms (giống prototype) */
const AUTO_LOOKUP_MS = 400;

/** Ô MST + tra cứu; tra thấy thì gọi onFound để điền form */
export function useTaxLookup(onFound: (r: BizLookup) => void) {
  const t = useTranslations('auth.register');
  const toast = useToast();
  const [tax, setTaxRaw] = useState('');
  const [foundTax, setFoundTax] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const lookup = async (code: string) => {
    if (foundTax === code) return;
    try {
      const r = await lookupBiz(code);
      setFoundTax(code);
      onFound(r);
      toast(t('lookedUp', { tax: code }));
    } catch {
      // NA-06 (REQ-206): tra cứu lỗi (mạng / 5xx / không thấy) không chặn đăng ký — nhập tay
      toast(t('lookupFailed'));
    }
  };

  const setTax = (v: string) => {
    const clean = v.replace(/[^0-9-]/g, '');
    setTaxRaw(clean);
    setFoundTax(undefined);
    clearTimeout(timer.current);
    if (TAX_CODE_RE.test(clean))
      timer.current = setTimeout(() => void lookup(clean), AUTO_LOOKUP_MS);
  };

  const onLookup = () => {
    const code = tax.trim();
    if (!TAX_CODE_RE.test(code)) return toast(t('errTax'));
    void lookup(code);
  };

  return { tax, setTax, onLookup, found: foundTax !== undefined && foundTax === tax };
}
