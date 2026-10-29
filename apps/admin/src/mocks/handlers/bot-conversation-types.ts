import {
  botConversationTypeInputSchema,
  botConversationTypeParamsSchema,
  botConversationTypesPageSchema,
  botConversationTypesQuerySchema,
} from '@opchub/shared/api-domains';
import {
  createMockConversationType,
  listMockConversationTypes,
  removeMockConversationType,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { botMutationReply, botWriteGuard, parseBotBody, parseBotQuery } from './bot-handler-utils';
import { validationError } from './domain-util';
import { API } from './util';

const base = `${API}/admin/bot/conversation-types`;
export const botConversationTypeHandlers = [
  http.get(base, ({ request }) => {
    const denied = mockAdminGuard(request, 'bots.view');
    if (denied) return denied;
    const query = parseBotQuery(request.url, botConversationTypesQuerySchema);
    if (!query.ok) return query.res;
    return HttpResponse.json(
      botConversationTypesPageSchema.parse(listMockConversationTypes(query.data)),
    );
  }),
  http.post(base, async ({ request }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const input = await parseBotBody(request, botConversationTypeInputSchema);
    if (!input.ok) return input.res;
    const result = createMockConversationType(input.data);
    return botMutationReply(
      request,
      result,
      'bot.conversation_type.create',
      'bot_conversation_type',
      result.ok ? result.data.id : 'type',
      `Thêm loại hội thoại ${input.data.name}`,
      201,
    );
  }),
  http.delete(`${base}/:id`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const parsed = botConversationTypeParamsSchema.safeParse({ id: params.id });
    if (!parsed.success) return validationError(parsed.error);
    return botMutationReply(
      request,
      removeMockConversationType(parsed.data.id),
      'bot.conversation_type.delete',
      'bot_conversation_type',
      parsed.data.id,
      'Xoá loại hội thoại tuỳ chỉnh',
    );
  }),
];
