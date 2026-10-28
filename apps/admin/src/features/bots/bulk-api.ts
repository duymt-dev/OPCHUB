import {
  botBulkBatchSchema,
  botBulkCreateSchema,
  botBulkItemsPageSchema,
  botBulkItemsQuerySchema,
  botBulkLatestSchema,
  botBulkParamsSchema,
  botBulkSavedSchema,
  botBulkSelectionSchema,
  type BotBulkCreate,
  type BotBulkSelection,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
import { botKeys } from './api';

const base = '/admin/bot/bulk-scripts';
const batchPath = (batchId: string) => `${base}/${botBulkParamsSchema.parse({ batchId }).batchId}`;
export const botBulkKeys = {
  all: [...botKeys.all, 'bulk'] as const,
  latest: () => [...botBulkKeys.all, 'latest'] as const,
  items: (id: string | null) => [...botBulkKeys.all, 'items', id] as const,
};
export const fetchLatestBotBulk = () => api(`${base}/latest`, { schema: botBulkLatestSchema });
export const createBotBulk = (body: BotBulkCreate) =>
  api(base, { method: 'POST', body: botBulkCreateSchema.parse(body), schema: botBulkBatchSchema });
export const fetchBotBulkItems = (id: string, after = -1) => {
  const query = botBulkItemsQuerySchema.parse({ after, limit: 50 });
  return api(`${batchPath(id)}/items?after=${query.after}&limit=${query.limit}`, {
    schema: botBulkItemsPageSchema,
  });
};
export const selectBotBulkItems = (id: string, body: BotBulkSelection) =>
  api(`${batchPath(id)}/selection`, {
    method: 'PATCH',
    body: botBulkSelectionSchema.parse(body),
    schema: botBulkBatchSchema,
  });
export const retryBotBulk = (id: string) =>
  api(`${batchPath(id)}/retry`, { method: 'POST', body: {}, schema: botBulkBatchSchema });
export const saveBotBulk = (id: string) =>
  api(`${batchPath(id)}/save`, { method: 'POST', body: {}, schema: botBulkSavedSchema });
