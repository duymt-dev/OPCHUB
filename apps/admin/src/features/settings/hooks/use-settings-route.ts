'use client';

import { useCallback } from 'react';
import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { CATEGORY_FILTERS, SETTINGS_TABS, type SettingsParams, type SettingsTab } from '../types';

/** Tab, lĩnh vực đang sửa (D-68) và bộ lọc lĩnh vực nằm trên URL (data-state.md) */
const paramsSchema = z.object({
  tab: z.enum(SETTINGS_TABS).catch('general'),
  edit: z.string().catch(''),
  scope: z.enum(CATEGORY_FILTERS).catch('all'),
});

export function useSettingsRoute() {
  const { params, update } = useUrlParams<SettingsParams>(paramsSchema);
  const setTab = useCallback(
    (tab: SettingsTab) => update({ tab, edit: '', scope: 'all' }),
    [update],
  );
  return { params, update, setTab };
}
