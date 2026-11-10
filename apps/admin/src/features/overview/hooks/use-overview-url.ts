'use client';

import type { z } from 'zod';
import { useEffect } from 'react';
import { useUrlParams } from '@/lib/use-url-params';
import { overviewParamsSchema } from './overview-range';

export type OverviewParams = z.infer<typeof overviewParamsSchema>;

export function useOverviewUrl() {
  const state = useUrlParams<OverviewParams>(overviewParamsSchema);
  const { from, to, period } = state.params;
  const { update } = state;
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search);
    if (
      (raw.get('from') ?? '') !== from ||
      (raw.get('to') ?? '') !== to ||
      (raw.get('period') ?? 'month') !== period
    )
      update({ from, to, period });
  }, [from, to, period, update]);
  return state;
}
