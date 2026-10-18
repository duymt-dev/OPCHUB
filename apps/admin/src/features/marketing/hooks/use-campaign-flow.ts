'use client';

import type { Campaign, CampaignSaveMode } from '@opchub/shared/api-domains';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fetchEstimate, marketingKeys } from '../api';
import { duplicateForm, emptyCampaignForm, fmtN, formToCreate } from '../model';
import type { CampaignFormState, ConfirmRequest } from '../types';
import { useMarketingActions } from './use-marketing-actions';

/**
 * Luồng chiến dịch: form tạo / nhân bản, hộp xác nhận cho "Gửi ngay" và "Xóa" (không hoàn tác,
 * luật 10) rồi mới gọi API.
 */
export function useCampaignFlow() {
  const t = useTranslations('marketing.confirm');
  const act = useMarketingActions();
  const qc = useQueryClient();
  const [form, setForm] = useState<CampaignFormState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const closeConfirm = () => setConfirm(null);

  /** `onError`: form tự hiện lỗi tại ô / toast thông điệp server (BUG-022, BUG-024) */
  const submit = (f: CampaignFormState, mode: CampaignSaveMode, onError: (e: unknown) => void) =>
    act.create.mutate(formToCreate(f, mode), {
      onSuccess: () => {
        setConfirm(null);
        setForm(null);
      },
      onError: (e) => {
        setConfirm(null);
        onError(e);
      },
    });

  /** Nháp chưa có số người nhận → hỏi server ước tính trước khi xác nhận */
  const askSend = async (c: Campaign) => {
    let n = c.recipients;
    if (n === null) {
      n = await qc
        .fetchQuery({
          queryKey: marketingKeys.estimate(c.audience, c.groupIds),
          queryFn: () => fetchEstimate(c.audience, c.groupIds),
        })
        .then((r) => r.recipients)
        .catch(() => null);
    }
    setConfirm({
      title: t('sendTitle'),
      body: t('sendBody', { name: c.name, n: n === null ? '—' : fmtN(n) }),
      okLabel: t('sendOk'),
      danger: false,
      onOk: () => act.send.mutate(c, { onSettled: closeConfirm }),
    });
  };

  const askDelete = (c: Campaign) =>
    setConfirm({
      title: t('delTitle'),
      body: t('delBody', { name: c.name }),
      okLabel: t('delOk'),
      danger: true,
      onOk: () => act.remove.mutate(c, { onSettled: closeConfirm }),
    });

  return {
    act,
    form,
    confirm,
    busy: act.create.isPending || act.send.isPending || act.remove.isPending,
    openNew: () => setForm(emptyCampaignForm()),
    closeForm: () => setForm(null),
    closeConfirm,
    setConfirm,
    submit,
    rowActions: {
      onSend: (c: Campaign) => void askSend(c),
      onDuplicate: (c: Campaign) => setForm(duplicateForm(c)),
      onDelete: askDelete,
    },
  };
}
