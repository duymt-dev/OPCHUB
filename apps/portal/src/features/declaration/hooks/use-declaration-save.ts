'use client';

import { isFeeUsable } from '@opchub/shared';
import type { DeclarationRequest } from '@opchub/shared/api';
import { useFieldErrors, useToast } from '@opchub/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fieldsOf, messageOf } from '@/lib/api-errors';
import { formatDate } from '@/features/membership';
import { useAuthStore } from '@/lib/auth-store';
import { declarationKeys, saveDeclaration } from '../api';

/** Path lỗi server → khoá ô của popup */
const FIELD_MAP = {
  persona: 'persona',
  groupIds: 'groups',
  taxCode: 'tax',
  companyName: 'company',
  mainIndustry: 'industry',
  province: 'province',
} as const;
type ErrKey = (typeof FIELD_MAP)[keyof typeof FIELD_MAP];

/**
 * Lưu khai báo: lỗi tại ô + toast như prototype (`this.flash`). Lưu xong cập nhật `me` →
 * gate khai báo đóng; đang miễn phí 3 tháng (D-94 1A) → báo hạn miễn phí, ngược lại PaywallGate mở
 * Bảng giá (TK hết hạn / chưa đóng phí).
 */
export function useDeclarationSave(savedKey: 'personal.saved' | 'business.saved') {
  const t = useTranslations('declaration');
  const toast = useToast();
  const qc = useQueryClient();
  const fe = useFieldErrors<ErrKey>();
  const [busy, setBusy] = useState(false);

  /** Lỗi kiểm ở client: chữ lỗi tại ô + toast, không gọi API */
  const reject = (key: ErrKey, msg: string) => {
    const text = t(`err.${msg}` as 'err.persona');
    fe.show({ [key]: text });
    toast(text);
  };

  const submit = async (body: DeclarationRequest) => {
    if (busy) return;
    setBusy(true);
    try {
      const me = await saveDeclaration(body);
      const { accessToken, setSession } = useAuthStore.getState();
      if (accessToken) setSession(accessToken, me);
      await qc.invalidateQueries({ queryKey: declarationKeys.draft });
      const fee = me.membershipFee;
      toast(
        fee?.status === 'trial' && isFeeUsable(fee, new Date())
          ? t('savedTrial', { date: formatDate(fee.validUntil) })
          : t(savedKey),
      );
    } catch (e) {
      const fields = fieldsOf<ErrKey>(e, FIELD_MAP);
      const text = fe.show(fields) ?? messageOf(e, t('err.failed'));
      toast(text);
    } finally {
      setBusy(false);
    }
  };

  return { err: fe.err, clear: fe.clear, reject, submit, busy };
}
