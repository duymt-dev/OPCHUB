'use client';

import {
  firstStoreNeed,
  type StoreDetail,
  type StoreStep,
  storeStepNeeds,
  type StoreUpsert,
} from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { messageOf } from '@/lib/api-errors';
import { publishMyStore, saveMyStore, storeKeys } from '../api';
import { toDraft } from '../model';

/** Vá bản đang sửa — hàm nhận bản mới nhất (nhiều tệp tải song song không ghi đè nhau) */
export type DraftPatch = (
  patch: Partial<StoreUpsert> | ((d: StoreUpsert) => Partial<StoreUpsert>),
) => void;

/** `step.N` (server 400) → bước N để nhảy về như prototype */
const stepOf = (e: unknown): StoreStep | null => {
  const path = e instanceof ApiError ? e.fields[0]?.path : undefined;
  const n = Number(path?.match(/^step\.(\d)$/)?.[1]);
  return n >= 1 && n <= 5 ? (n as StoreStep) : null;
};

/**
 * D-97 trình tạo 5 bước (prototype `wz`, index.html :5304 → 5343): bản đang sửa, bước, `go` chỉ cho
 * tiến khi các bước trước đủ (toast câu lỗi), Lưu nháp (không kiểm), Xuất bản / Lưu thay đổi (kiểm đủ
 * 5 bước, sai → về bước đầu tiên chưa đủ). Server kiểm lại cùng điều kiện (`step.N`).
 * `edit` = vào từ "Chỉnh sửa gian hàng" (prototype `isEd`): tiêu đề + nút cuối "Lưu thay đổi".
 * D-114 S8 B: gian hàng đang hiển thị — nút phụ cũng là "Lưu thay đổi", giữ hiển thị (không về nháp).
 */
export function useStoreWizard(
  store: StoreDetail,
  edit: boolean,
  onDone: () => void,
  initialStep: StoreStep = 1,
) {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('stores.wizard');
  const [draft, setDraft] = useState<StoreUpsert>(() => toDraft(store));
  const [step, setStep] = useState<StoreStep>(initialStep);
  const set: DraftPatch = (patch) =>
    setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) }));
  const needs = storeStepNeeds(draft);
  const live = store.status === 'published';

  const done = (s: StoreDetail) => {
    qc.setQueryData(storeKeys.mine(), s);
    void qc.invalidateQueries({ queryKey: storeKeys.all, refetchType: 'none' });
  };
  const onError = (e: unknown) => {
    const n = stepOf(e);
    if (n) setStep(n);
    toast(messageOf(e, t('failed')));
  };
  const save = useMutation({
    mutationFn: () => saveMyStore(draft),
    onSuccess: (s) => {
      done(s);
      toast(t(live ? 'toastSaved' : 'toastDraft'));
    },
    onError,
  });
  const publish = useMutation({
    mutationFn: async () => {
      const saved = await saveMyStore(draft);
      return saved.status === 'published' ? saved : publishMyStore();
    },
    onSuccess: (s) => {
      done(s);
      toast(t(edit ? 'toastSaved' : 'toastPublished'));
      onDone();
    },
    onError,
  });

  const go = (n: StoreStep) => {
    for (let i = step; i < n; i += 1) {
      const key = needs[i][0];
      if (key) return toast(t(`need.${key}`));
    }
    setStep(n);
  };
  /** Bước đầu tiên chưa đủ → nhảy về + toast; đủ → true */
  const complete = () => {
    const n = firstStoreNeed(draft);
    if (!n) return true;
    setStep(n.step);
    toast(t(`need.${n.key}`));
    return false;
  };
  const submit = () => {
    if (store.status === 'hidden') return toast(t('hiddenByAdmin'));
    if (complete()) publish.mutate();
  };
  // Đang hiển thị: lưu giữ hiển thị nên phải đủ 5 bước như Xuất bản (server kiểm lại)
  const saveDraft = () => {
    if (!live || complete()) save.mutate();
  };

  return {
    draft,
    set,
    step,
    needs,
    edit,
    live,
    busy: save.isPending || publish.isPending,
    go,
    back: () => setStep((s) => Math.max(1, s - 1) as StoreStep),
    saveDraft,
    submit,
  };
}
export type StoreWizard = ReturnType<typeof useStoreWizard>;
