'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';

const overviewParamsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .catch(''),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .catch(''),
  period: z.enum(['week', 'month', 'year']).catch('month'),
});

export type OverviewParams = z.infer<typeof overviewParamsSchema>;

export function useOverviewUrl() {
  return useUrlParams<OverviewParams>(overviewParamsSchema);
}
