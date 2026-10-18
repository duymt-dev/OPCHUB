'use client';

import type { AdminCategory } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  reorderCategories,
  settingsKeys,
  toggleCategory,
  updateCategory,
} from '../api';
import { CATEGORY_FIELD_MAP, type CategoryErrors, moveId, validateCategory } from '../model';
import type { CategoryDraft } from '../types';
import { useSettingsMutation } from './use-settings-mutation';

const key = settingsKeys.categories;

/** Phần của `useFormErrors` mà luồng lưu lĩnh vực cần (form giữ state lỗi) */
export interface CategoryFormErrors {
  check: (errors: Partial<Record<'name' | 'scope', string>>) => boolean;
  translate: (errors: CategoryErrors) => Partial<Record<'name' | 'scope', string>>;
  fromApi: (e: unknown, map: typeof CATEGORY_FIELD_MAP, fallback: string) => void;
}

/** D-67, D-68 Danh mục lĩnh vực: thêm / sửa / ẩn / xoá / đổi thứ tự — mọi thao tác ghi audit */
export function useCategories() {
  const t = useTranslations('settings.cat');
  const c = useTranslations('settings.common');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: key, queryFn: fetchCategories });
  const rows = q.data ?? [];

  const create = useSettingsMutation({ key, fn: createCategory, silent: true });
  const update = useSettingsMutation({
    key,
    fn: (v: { id: string; d: CategoryDraft; enabled: boolean }) =>
      updateCategory(v.id, v.d, v.enabled),
    silent: true,
  });
  const toggle = useSettingsMutation({
    key,
    fn: (v: { id: string; enabled: boolean }) => toggleCategory(v.id, v.enabled),
  });
  const remove = useSettingsMutation({ key, fn: deleteCategory });
  const reorder = useSettingsMutation({ key, fn: reorderCategories, write: true });

  /**
   * Kiểm rồi gửi; `fe` của form hiện lỗi tại ô (BUG-022) — cả lỗi kiểm ở client lẫn `fields`
   * server; `done` khi đã lưu (form được đóng / xoá trắng).
   */
  const save = (d: CategoryDraft, done: () => void, fe: CategoryFormErrors): void => {
    if (fe.check(fe.translate(validateCategory(d, rows)))) return;
    const name = d.name.trim();
    const cur = d.id ? rows.find((c) => c.id === d.id) : undefined;
    const onError = (e: unknown) => fe.fromApi(e, CATEGORY_FIELD_MAP, c('failed'));
    if (d.id && cur)
      update.mutate(
        { id: d.id, d, enabled: cur.enabled },
        { onSuccess: () => (toast(t('updated', { name })), done()), onError },
      );
    else create.mutate(d, { onSuccess: () => (toast(t('added', { name })), done()), onError });
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = moveId(
      rows.map((c) => c.id),
      i,
      dir,
    );
    if (!ids) return;
    // Lạc quan: đổi thứ tự ngay, server trả danh sách chuẩn
    const byId = new Map(rows.map((c) => [c.id, c]));
    qc.setQueryData<AdminCategory[]>(
      key,
      ids.flatMap((id) => byId.get(id) ?? []),
    );
    reorder.mutate(ids);
  };

  return {
    rows,
    save,
    move,
    toggle: (c: AdminCategory) => toggle.mutate({ id: c.id, enabled: !c.enabled }),
    inUse: (c: AdminCategory) => c.projectCount + c.bizCount > 0,
    warnInUse: () => toast(t('inUse')),
    remove: (c: AdminCategory) =>
      remove.mutate(c.id, { onSuccess: () => toast(t('deleted', { name: c.name })) }),
  };
}
