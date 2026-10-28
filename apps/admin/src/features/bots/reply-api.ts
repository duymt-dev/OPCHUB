import {
  botReplyOverviewSchema,
  botReplyScanResultSchema,
  botReplySettingsPatchSchema,
  botReplySettingsSchema,
  type BotReplySettings,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { botKeys } from './api';

export const botReplyKey = [...botKeys.all, 'replies'] as const;
export const fetchBotReplies = () => api('/admin/bot/replies', { schema: botReplyOverviewSchema });
export const patchBotReplies = (body: Partial<BotReplySettings>) =>
  api('/admin/bot/replies/settings', {
    method: 'PATCH',
    body: botReplySettingsPatchSchema.parse(body),
    schema: botReplySettingsSchema,
  });
export const scanBotReplies = () =>
  api('/admin/bot/replies/scan', { method: 'POST', body: {}, schema: botReplyScanResultSchema });
export const stopBotReplies = (id: string) =>
  api(`/admin/bot/replies/${encodeURIComponent(id)}/stop`, {
    method: 'POST',
    body: {},
    schema: botReplyScanResultSchema,
  });
