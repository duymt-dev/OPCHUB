'use client';

import type { ProjectBulkAction, ProjectBulkResult } from '@opchub/shared/api-domains';
import { type ConfirmRequest, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { AdminProject } from '../types';
import { useBulkProjects, useDeleteProject, useFeatureProject } from './use-projects';

interface Ctx {
  ask: (req: ConfirmRequest) => void;
  done: (msg: string) => void;
}

const BULK_TOAST = { publish: 'published', hide: 'hiddenMany', delete: 'deletedMany' } as const;

/** Xoá một dự án, thao tác hàng loạt (D-54) và nổi bật tuần — xoá / ẩn qua hộp xác nhận */
export function useProjectBulk({ ask, done }: Ctx) {
  const t = useTranslations('projects');
  const toast = useToast();
  const bulk = useBulkProjects();
  const del = useDeleteProject();
  const feat = useFeatureProject();

  const remove = (p: AdminProject) =>
    ask({
      title: t('confirm.deleteTitle'),
      body: t('confirm.deleteOne', { name: p.name }),
      okLabel: t('confirm.delete'),
      cancelLabel: t('confirm.cancel'),
      danger: true,
      onOk: () => del.mutate(p.id, { onSuccess: () => done(t('toast.deleted', { name: p.name })) }),
    });

  const bulkMsg = (action: ProjectBulkAction, r: ProjectBulkResult) => {
    const text = t(`toast.${BULK_TOAST[action]}`, { count: r.done.length });
    return r.skipped.length ? t('toast.skipped', { text, count: r.skipped.length }) : text;
  };

  const run = (ids: string[], action: ProjectBulkAction, clear: () => void) =>
    bulk.mutate(
      { ids, action },
      {
        onSuccess: (r) => {
          clear();
          done(bulkMsg(action, r));
        },
      },
    );

  const bulkAction = (ids: string[], action: ProjectBulkAction, clear: () => void) => {
    if (!ids.length) return;
    if (action === 'publish') return run(ids, action, clear);
    const isDel = action === 'delete';
    ask({
      title: t(isDel ? 'confirm.deleteTitle' : 'confirm.hideTitle'),
      body: t(isDel ? 'confirm.deleteMany' : 'confirm.hideMany', { count: ids.length }),
      okLabel: t(isDel ? 'confirm.delete' : 'confirm.hide'),
      cancelLabel: t('confirm.cancel'),
      danger: true,
      onOk: () => run(ids, action, clear),
    });
  };

  const toggleFeature = (p: AdminProject) => {
    if (p.status !== 'published') return toast(t('toast.featureLiveOnly'));
    feat.mutate(p.featured ? null : p.id, {
      onSuccess: () =>
        toast(p.featured ? t('toast.unfeatured') : t('toast.featured', { name: p.name })),
    });
  };

  return { remove, bulkAction, toggleFeature, busy: bulk.isPending || del.isPending };
}
