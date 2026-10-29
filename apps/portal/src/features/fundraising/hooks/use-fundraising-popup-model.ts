'use client';

import { fundAmountOf } from '@opchub/shared';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePrices } from '@/lib/use-prices';
import type { PickableProject } from '../components/project-pick';
import { useFundraisingPay } from './use-fundraising-pay';

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;

/**
 * Trạng thái popup Gói Gọi vốn: dự án đang chọn (một dự án / khoản, D-94 4B), khoản thanh toán, số tiền
 * hiển thị (khoản đã chốt; chưa có → giá Cấu hình bảng giá), Esc đóng, sao chép, "Tôi đã chuyển khoản".
 */
export function useFundraisingPopupModel(
  projectId: string | null,
  options: readonly PickableProject[],
  hide: () => void,
) {
  const t = useTranslations('projects.fundPlan');
  const toast = useToast();
  const prices = usePrices();
  const fund = prices?.fund;
  const pick = projectId === null;
  const [selected, setSelected] = useState<string | null>(
    pick ? (options[0]?.id ?? null) : projectId,
  );
  const f = useFundraisingPay(selected, hide);
  const opt = options.find((o) => o.id === selected);
  const amount = f.pay?.amount ?? (prices ? fundAmountOf(prices, !!opt?.renew) : undefined);
  const amountText =
    amount !== undefined && fund
      ? t(opt?.renew ? 'amountRenew' : 'amountValue', { amount: vnd(amount), months: fund.mo })
      : '—';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hide]);

  return {
    pick,
    selected,
    setSelected,
    f,
    amountText,
    unit: fund ? t('unit', { price: vnd(fund.p), months: fund.mo }) : '',
    feeOf: (o: PickableProject) =>
      prices ? `${vnd(fundAmountOf(prices, o.renew))}${o.renew ? t('renewTag') : ''}` : '—',
    done: () => {
      if (!f.pay) return toast(t('pickRequired'));
      f.confirm.mutate(f.pay.id);
    },
    copy: (text: string) => {
      void navigator.clipboard?.writeText(text).catch(() => undefined);
      toast(t('copied'));
    },
  };
}
