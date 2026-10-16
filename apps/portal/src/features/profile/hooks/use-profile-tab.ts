'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import { PROFILE_TABS, type ProfileTab } from '../types';

/** Tab hồ sơ nằm trên URL `?tab=` (data-state.md) */
const schema = z.object({ tab: z.enum(PROFILE_TABS).catch('info') });

export function useProfileTab(): [ProfileTab, (tab: ProfileTab) => void] {
  const { params, update } = useUrlParams<{ tab: ProfileTab }>(schema);
  return [params.tab, (tab) => update({ tab })];
}
