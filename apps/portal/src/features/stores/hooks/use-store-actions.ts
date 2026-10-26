'use client';

import { canPublishStore, type StoreDetail, type StoreUpsert } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { messageOf } from '@/lib/api-errors';
import { publishMyStore, saveMyStore, storeKeys, unpublishMyStore } from '../api';

/**
 * Lưu / Xuất bản / Gỡ xuống (UT-09). Trạng thái do server chuyển (luật 7); Xuất bản lưu bản đang
 * sửa trước rồi mới gọi publish để server kiểm đúng dữ liệu vừa nhập.
 */
export function useStoreActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const t = useTranslations('stores.toast');
  const done = (s: StoreDetail) => {
    qc.setQueryData(storeKeys.mine(), s);
    void qc.invalidateQueries({ queryKey: storeKeys.all, refetchType: 'none' });
  };
  const onError = (e: unknown) => toast(messageOf(e, t('failed')));

  /** `text`: toast sau khi lưu (thêm / sửa / xoá sản phẩm dùng câu riêng của prototype) */
  const save = useMutation({
    mutationFn: (v: { body: StoreUpsert; text: string }) => saveMyStore(v.body),
    onSuccess: (s, v) => {
      done(s);
      toast(v.text);
    },
    onError,
  });
  const publish = useMutation({
    mutationFn: async (body: StoreUpsert) => {
      done(await saveMyStore(body));
      return publishMyStore();
    },
    onSuccess: (s) => {
      done(s);
      toast(t('published'));
    },
    onError,
  });
  const unpublish = useMutation({
    mutationFn: unpublishMyStore,
    onSuccess: (s) => {
      done(s);
      toast(t('unpublished'));
    },
    onError,
  });

  return {
    busy: save.isPending || publish.isPending || unpublish.isPending,
    save: (body: StoreUpsert, text?: string) => save.mutate({ body, text: text ?? t('saved') }),
    publish: (cur: StoreDetail, body: StoreUpsert) => {
      // Kiểm ở client như prototype; server kiểm lại (400 kèm cùng câu)
      if (cur.status === 'hidden') return toast(t('hidden'));
      if (!canPublishStore(body)) return toast(t('needPublish'));
      publish.mutate(body);
    },
    unpublish: () => unpublish.mutate(),
  };
}
