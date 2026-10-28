import { botBulkCreateSchema, botBulkItemsQuerySchema } from '@opchub/shared/api-domains';
import {
  advanceMockBulk,
  createMockBulk,
  latestMockBulk,
  listMockBulkItems,
  readMockBulk,
  botState,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { botMutationReply, botWriteGuard, parseBotBody, parseBotQuery } from './bot-handler-utils';
import { reply, userIdOf } from './domain-util';
import { API } from './util';
import { bulkParams } from './bot-bulk-utils';
import { botBulkActionHandlers } from './bot-bulk-actions';

const base = `${API}/admin/bot/bulk-scripts`;
export const botBulkHandlers = [
  http.get(`${base}/latest`, ({ request }) => {
    const denied = mockAdminGuard(request, 'bots.view');
    if (denied) return denied;
    advanceMockBulk();
    return HttpResponse.json(latestMockBulk(userIdOf(request)));
  }),
  http.get(`${base}/:batchId/items`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'bots.view');
    if (denied) return denied;
    const id = bulkParams(params);
    if (!id.ok) return id.res;
    const query = parseBotQuery(request.url, botBulkItemsQuerySchema);
    if (!query.ok) return query.res;
    return reply(listMockBulkItems(id.id, query.data));
  }),
  http.get(`${base}/:batchId`, ({ request, params }) => {
    const denied = mockAdminGuard(request, 'bots.view');
    if (denied) return denied;
    const id = bulkParams(params);
    if (!id.ok) return id.res;
    advanceMockBulk();
    return reply(readMockBulk(id.id));
  }),
  http.post(base, async ({ request }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const input = await parseBotBody(request, botBulkCreateSchema);
    if (!input.ok) return input.res;
    const actor = userIdOf(request);
    const replay = botState().bulk.some(
      (r) => r.actorId === actor && r.requestId === input.data.requestId,
    );
    const result = createMockBulk(actor, input.data);
    return replay
      ? reply(result, 202)
      : botMutationReply(
          request,
          result,
          'bot.bulk.create',
          'bot_bulk_batch',
          result.ok ? result.data.id : 'batch',
          'Yêu cầu AI tạo kịch bản',
          202,
        );
  }),
  ...botBulkActionHandlers,
];
