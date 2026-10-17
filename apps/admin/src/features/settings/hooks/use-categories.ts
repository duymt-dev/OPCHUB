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
import { moveId, validateCategory } from '../model';
import type { CategoryDraft } from '../types';
import { useSettingsMutation } from './use-settings-mutation';

const key = settingsKeys.categories;

/** D-67, D-68 Danh mục lĩnh vực: thêm / sửa / ẩn / xoá / đổi thứ tự — mọi thao tác ghi audit */
export function useCategories() {
  const t = useTranslations('settings.cat');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: key, queryFn: fetchCategories });
  const rows = q.data ?? [];

  const create = useSettingsMutation({ key, fn: createCategory });
  const update = useSettingsMutation({
    key,
    fn: (v: { id: string; d: CategoryDraft; enabled: boolean }) =>
      updateCategory(v.id, v.d, v.enabled),
  });
  const toggle = useSettingsMutation({
    key,
    fn: (v: { id: string; enabled: boolean }) => toggleCategory(v.id, v.enabled),
  });
  const remove = useSettingsMutation({ key, fn: deleteCategory });
  const reorder = useSettingsMutation({ key, fn: reorderCategories, write: true });

  /** Trả true khi đã gửi (form được đóng / xoá trắng) */
  const save = (d: CategoryDraft, done: () => void): void => {
    const err = validateCategory(d, rows);
    if (err) return toast(t(err));
    const name = d.name.trim();
    const cur = d.id ? rows.find((c) => c.id === d.id) : undefined;
    if (d.id && cur)
      update.mutate(
        { id: d.id, d, enabled: cur.enabled },
        { onSuccess: () => (toast(t('updated', { name })), done()) },
      );
    else create.mutate(d, { onSuccess: () => (toast(t('added', { name })), done()) });
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
