import { botSchedulePatchSchema, botScheduleResponseSchema } from '@opchub/shared/api-domains';
import { mockBotSchedule, patchMockBotSchedule } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { botMutationReply, botWriteGuard, parseBotBody } from './bot-handler-utils';
import { API } from './util';

export const botScheduleHandlers = [
  http.get(
    `${API}/admin/bot/schedule`,
    ({ request }) =>
      mockAdminGuard(request, 'bots.view') ??
      HttpResponse.json(botScheduleResponseSchema.parse(mockBotSchedule())),
  ),
  http.patch(`${API}/admin/bot/schedule`, async ({ request }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const parsed = await parseBotBody(request, botSchedulePatchSchema);
    if (!parsed.ok) return parsed.res;
    return botMutationReply(
      request,
      patchMockBotSchedule(parsed.data),
      'bot.schedule.update',
      'bot_settings',
      'bot_schedule',
      'Cập nhật lịch chạy bot',
    );
  }),
];
