'use client';

import type { ServiceRequest } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { createServiceRequest, fetchRequester, fetchServices, serviceKeys } from '../api';
import { firstError, initialForm, toRequest } from '../model';
import type { ConsultField, ConsultForm } from '../types';

export function useServices() {
  return useQuery({
    queryKey: serviceKeys.list,
    queryFn: fetchServices,
    select: (r) => r.items.filter((s) => s.enabled),
    staleTime: 5 * 60_000,
  });
}

export function useRequester() {
  return useQuery({ queryKey: serviceKeys.requester, queryFn: fetchRequester, staleTime: 60_000 });
}

/**
 * Form tư vấn: điền sẵn từ hồ sơ, kiểm lần lượt như prototype (toast lỗi đầu tiên),
 * gửi `POST /service-requests` với Idempotency-Key giữ nguyên khi bấm lại.
 */
export function useConsultForm(svcId: string, onSent: (r: ServiceRequest) => void) {
  const t = useTranslations('services');
  const toast = useToast();
  const me = useRequester();
  const [form, setForm] = useState<ConsultForm | null>(null);
  const key = useRef(crypto.randomUUID());
  const current = form ?? (me.isFetched ? initialForm(svcId, me.data) : null);

  const send = useMutation({
    mutationFn: (f: ConsultForm) => createServiceRequest(toRequest(f), key.current),
    onSuccess: (r) => {
      key.current = crypto.randomUUID();
      toast(t('done.toast', { code: r.code }));
      onSent(r);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('error.failed')),
  });

  // Cập nhật theo bản trước đó — hai thay đổi liền nhau (chọn + gõ) không ghi đè nhau
  const set = (k: ConsultField, v: string) => {
    if (!current) return;
    setForm((prev) => ({ ...(prev ?? current), [k]: v }));
  };

  const submit = () => {
    if (!current || send.isPending) return;
    const err = firstError(current);
    if (err) return toast(t(`error.${err}`));
    send.mutate(current);
  };

  return { form: current, set, submit };
}
