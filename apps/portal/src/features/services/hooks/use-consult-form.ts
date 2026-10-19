'use client';

import type { ServiceRequest } from '@opchub/shared/api-domains';
import { translateErrors, useToast } from '@opchub/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useFormErrors } from '@/lib/use-form-errors';
import { createServiceRequest, fetchRequester, fetchServices, serviceKeys } from '../api';
import {
  CONSULT_FIELD_MAP,
  type ConsultError,
  consultErrors,
  initialForm,
  toRequest,
} from '../model';
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
 * Form tư vấn: điền sẵn từ hồ sơ, kiểm MỌI ô (lỗi tại ô + toast lỗi đầu tiên như prototype —
 * BUG-022), gửi `POST /service-requests` với Idempotency-Key giữ nguyên khi bấm lại; 400 có
 * `fields` → lỗi tại ô.
 */
export function useConsultForm(svcId: string, onSent: (r: ServiceRequest) => void) {
  const t = useTranslations('services');
  const toast = useToast();
  const me = useRequester();
  const fe = useFormErrors<ConsultError>();
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
    onError: (e) => fe.fromApi(e, CONSULT_FIELD_MAP, t('error.failed')),
  });

  // Cập nhật theo bản trước đó — hai thay đổi liền nhau (chọn + gõ) không ghi đè nhau
  const set = (k: ConsultField, v: string) => {
    if (!current) return;
    setForm((prev) => ({ ...(prev ?? current), [k]: v }));
    // Đổi Cá nhân/DN → bộ ô khác: xoá hết lỗi cũ
    if (k === 'kind') fe.show({});
    else fe.clear(k);
  };

  const submit = () => {
    if (!current || send.isPending) return;
    if (fe.check(translateErrors(consultErrors(current), (e) => t(`error.${e}`)))) return;
    send.mutate(current);
  };

  return { form: current, set, submit, err: fe.err };
}
