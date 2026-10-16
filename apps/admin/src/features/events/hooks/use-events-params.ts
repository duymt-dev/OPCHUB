'use client';

import { z } from 'zod';
import { useUrlParams } from '@/lib/use-url-params';
import {
  DEFAULT_PAGE_SIZE,
  EVENT_MODES,
  EVENT_STATUSES,
  EVENT_VIEWS,
  PAGE_SIZES,
  type EventsParams,
} from '../types';

/** Tìm, trạng thái, hình thức, kiểu xem, trang, cỡ trang — trên URL (data-state.md) */
const schema = z.object({
  q: z.string().catch(''),
  status: z.enum(EVENT_STATUSES).catch('all'),
  mode: z.enum(EVENT_MODES).catch('all'),
  view: z.enum(EVENT_VIEWS).catch('grid'),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(DEFAULT_PAGE_SIZE),
});

export function useEventsParams() {
  return useUrlParams<EventsParams>(schema);
}
