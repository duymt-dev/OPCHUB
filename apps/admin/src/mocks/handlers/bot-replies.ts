import {
  botReplyOverviewSchema,
  botReplySettingsSchema,
  botReplySettingsPatchSchema,
  botReplyScanSchema,
  botReplyScanResultSchema,
} from '@opchub/shared/api-domains';
import {
  mockReplyOverview,
  mockReplySettings,
  patchMockReplySettings,
  currentMockReplyRun,
  scanMockReplyRun,
  stopMockReplyRun,
  advanceMockReplies,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { botMutationReply, botWriteGuard, parseBotBody } from './bot-handler-utils';
import { API } from './util';

const base = `${API}/admin/bot/replies`;
export const botReplyHandlers = [
  http.get(base, ({ request }) => {
    const denied = mockAdminGuard(request, 'bots.view');
    if (denied) return denied;
    advanceMockReplies();
    return HttpResponse.json(botReplyOverviewSchema.parse(mockReplyOverview()));
  }),
  http.get(
    `${base}/settings`,
    ({ request }) =>
      mockAdminGuard(request, 'bots.view') ??
      HttpResponse.json(botReplySettingsSchema.parse(mockReplySettings())),
  ),
  http.get(
    `${base}/run`,
    ({ request }) =>
      mockAdminGuard(request, 'bots.view') ??
      HttpResponse.json(botReplyScanResultSchema.parse({ run: currentMockReplyRun() })),
  ),
  http.patch(`${base}/settings`, async ({ request }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const parsed = await parseBotBody(request, botReplySettingsPatchSchema);
    if (!parsed.ok) return parsed.res;
    return botMutationReply(
      request,
      patchMockReplySettings(parsed.data),
      'bot.reply_settings.update',
      'bot_settings',
      'bot_reply_settings',
      'Cập nhật trả lời từng tin',
    );
  }),
  http.post(`${base}/scan`, async ({ request }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const parsed = await parseBotBody(request, botReplyScanSchema);
    if (!parsed.ok) return parsed.res;
    const result = scanMockReplyRun(true);
    return botMutationReply(
      request,
      result,
      'bot.reply.scan',
      'bot_reply_run',
      result.ok ? (result.data.run?.id ?? 'reply') : 'reply',
      'Quét trả lời từng tin',
      202,
    );
  }),
  http.post(`${base}/:id/stop`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const id = String(params.id);
    return botMutationReply(
      request,
      stopMockReplyRun(id),
      'bot.reply.stop',
      'bot_reply_run',
      id,
      'Dừng trả lời từng tin',
    );
  }),
];
