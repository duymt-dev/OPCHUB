'use client';

import type { Campaign, CampaignSaveMode } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { campaignCells, duplicateForm, emptyCampaignForm, formToCreate } from '../model';
import type { CampaignFormState, ConfirmRequest } from '../types';
import { useMarketingActions } from './use-marketing-actions';

/**
 * Luồng chiến dịch: form tạo / nhân bản, hộp xác nhận cho "Gửi ngay" và "Xóa" (không hoàn tác,
 * luật 10) rồi mới gọi API.
 */
export function useCampaignFlow() {
  const t = useTranslations('marketing.confirm');
  const act = useMarketingActions();
  const [form, setForm] = useState<CampaignFormState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const closeConfirm = () => setConfirm(null);

  const submit = (f: CampaignFormState, mode: CampaignSaveMode) =>
    act.create.mutate(formToCreate(f, mode), {
      onSuccess: () => {
        setConfirm(null);
        setForm(null);
      },
    });

  const askSend = (c: Campaign) =>
    setConfirm({
      title: t('sendTitle'),
      body: t('sendBody', { name: c.name, n: campaignCells(c).recipients }),
      okLabel: t('sendOk'),
      danger: false,
      onOk: () => act.send.mutate(c, { onSettled: closeConfirm }),
    });

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
      onSend: askSend,
      onDuplicate: (c: Campaign) => setForm(duplicateForm(c)),
      onDelete: askDelete,
    },
  };
}
