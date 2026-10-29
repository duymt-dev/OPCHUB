import {
  botSchedulePatchSchema,
  botScheduleResponseSchema,
  type BotSchedulePatch,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { botKeys } from './api';

export const botScheduleKey = [...botKeys.all, 'schedule'] as const;
export const fetchBotSchedule = () =>
  api('/admin/bot/schedule', { schema: botScheduleResponseSchema });
export const patchBotSchedule = (body: BotSchedulePatch) =>
  api('/admin/bot/schedule', {
    method: 'PATCH',
    body: botSchedulePatchSchema.parse(body),
    schema: botScheduleResponseSchema,
  });
