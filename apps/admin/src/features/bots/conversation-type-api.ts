import {
  botConversationTypeInputSchema,
  botConversationTypeParamsSchema,
  botConversationTypeSchema,
  botConversationTypesPageSchema,
  botConversationTypesQuerySchema,
  idResultSchema,
  type BotConversationTypeInput,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { botKeys } from './api';

const base = '/admin/bot/conversation-types';
export const botConversationTypesKey = [...botKeys.all, 'conversation-types'] as const;
export const fetchBotConversationTypes = (after?: string) => {
  const query = botConversationTypesQuerySchema.parse({ after, limit: 50 });
  const cursor = query.after ? `&after=${encodeURIComponent(query.after)}` : '';
  return api(`${base}?limit=${query.limit}${cursor}`, { schema: botConversationTypesPageSchema });
};
export const createBotConversationType = (body: BotConversationTypeInput) =>
  api(base, {
    method: 'POST',
    body: botConversationTypeInputSchema.parse(body),
    schema: botConversationTypeSchema,
  });
export const deleteBotConversationType = (id: string) => {
  const params = botConversationTypeParamsSchema.parse({ id });
  return api(`${base}/${encodeURIComponent(params.id)}`, {
    method: 'DELETE',
    schema: idResultSchema,
  });
};
