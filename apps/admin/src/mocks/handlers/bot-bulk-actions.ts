import { botBulkActionSchema, botBulkSelectionSchema } from '@opchub/shared/api-domains';
import { retryMockBulk, saveMockBulk, selectMockBulk } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { botMutationReply, botWriteGuard, parseBotBody } from './bot-handler-utils';
import { reply, userIdOf } from './domain-util';
import { API } from './util';
import { bulkParams } from './bot-bulk-utils';

const base = `${API}/admin/bot/bulk-scripts`;
export const botBulkActionHandlers = [
  http.patch(`${base}/:batchId/selection`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const id = bulkParams(params);
    if (!id.ok) return id.res;
    const input = await parseBotBody(request, botBulkSelectionSchema);
    if (!input.ok) return input.res;
    return botMutationReply(
      request,
      selectMockBulk(id.id, input.data),
      'bot.bulk.selection',
      'bot_bulk_batch',
      id.id,
      'Cập nhật lựa chọn kịch bản AI',
    );
  }),
  http.post(`${base}/:batchId/retry`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const id = bulkParams(params);
    if (!id.ok) return id.res;
    const input = await parseBotBody(request, botBulkActionSchema);
    if (!input.ok) return input.res;
    return botMutationReply(
      request,
      retryMockBulk(id.id),
      'bot.bulk.retry',
      'bot_bulk_batch',
      id.id,
      'Thử lại đợt tạo kịch bản AI',
      202,
    );
  }),
  http.post(`${base}/:batchId/save`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const id = bulkParams(params);
    if (!id.ok) return id.res;
    const input = await parseBotBody(request, botBulkActionSchema);
    if (!input.ok) return input.res;
    const result = saveMockBulk(id.id, userIdOf(request));
    if (result.ok && !result.data.saved) return reply(result);
    return botMutationReply(
      request,
      result,
      'bot.bulk.save',
      'bot_bulk_batch',
      id.id,
      `Lưu ${result.ok ? result.data.saved : 0} kịch bản AI đã chọn`,
    );
  }),
];
