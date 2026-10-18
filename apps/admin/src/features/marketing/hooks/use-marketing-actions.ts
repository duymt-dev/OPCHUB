'use client';

import type { Campaign, CampaignCreate, MailLogRow, WelcomeMail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import {
  cancelCampaign,
  createCampaign,
  deleteCampaign,
  marketingKeys,
  resendMail,
  saveWelcome,
  sendCampaign,
  testWelcome,
} from '../api';
import { fmtN } from '../model';

/**
 * Thao tác ghi của màn Marketing — mọi thao tác gọi API (BE ghi audit_logs, luật 10);
 * gửi mail chỉ tạo job qua outbox (202), không gửi trong request.
 */
export function useMarketingActions() {
  const t = useTranslations('marketing');
  const toast = useToast();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: marketingKeys.all });
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : t('errors.failed'));

  const create = useMutation({
    mutationFn: (body: CampaignCreate) => createCampaign(body),
    onSuccess: (c) => {
      if (c.status === 'sending') toast(t('toast.sendingTo', { n: fmtN(c.recipients ?? 0) }));
      else toast(t(c.status === 'scheduled' ? 'toast.scheduled' : 'toast.draft'));
      refresh();
    },
    // Lỗi tạo do form xử lý (lỗi tại ô theo `fields` — BUG-022), xem use-campaign-flow
  });

  const send = useMutation({
    mutationFn: (c: Campaign) => sendCampaign(c.id),
    onSuccess: (_j, c) => {
      toast(t('toast.sending', { name: c.name }));
      refresh();
    },
    onError: fail,
  });

  const cancel = useMutation({
    mutationFn: (c: Campaign) => cancelCampaign(c.id),
    onSuccess: (_c, c) => {
      toast(t('toast.cancelled', { name: c.name }));
      refresh();
    },
    onError: (e) => {
      fail(e);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (c: Campaign) => deleteCampaign(c.id),
    onSuccess: () => {
      toast(t('toast.deleted'));
      refresh();
    },
    onError: fail,
  });

  const resend = useMutation({
    mutationFn: (r: MailLogRow) => resendMail(r.id),
    onSuccess: (_j, r) => {
      toast(t('toast.resent', { to: r.to }));
      void qc.invalidateQueries({ queryKey: marketingKeys.log });
    },
    onError: fail,
  });

  const saveTpl = useMutation({
    mutationFn: saveWelcome,
    onSuccess: (w) => {
      qc.setQueryData(marketingKeys.welcome, w);
      toast(t('toast.saved'));
    },
    onError: fail,
  });

  const test = useMutation({
    mutationFn: testWelcome,
    onSuccess: (_j, to) => toast(t('toast.tested', { to })),
    onError: fail,
  });

  return {
    create,
    send,
    cancel,
    remove,
    onResend: (r: MailLogRow) => resend.mutate(r),
    onSaveWelcome: (w: WelcomeMail) => saveTpl.mutate(w),
    onTestWelcome: (to: string) => test.mutate(to),
  };
}
