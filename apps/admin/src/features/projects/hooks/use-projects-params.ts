'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PROJECT_VIEWS,
  REVIEW_TABS,
  type ProjectsParams,
} from '../types';

/** Tab, kiểu xem, trang, cỡ trang — trên URL `/projects?tab=&view=&page=&size=` */
const schema = z.object({
  tab: z.enum(REVIEW_TABS).catch('live'),
  view: z.enum(PROJECT_VIEWS).catch('grid'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_PAGE_SIZE),
});

export function useProjectsParams() {
  return useUrlParams<ProjectsParams>(schema);
}
