import {
  botSettingsPatchSchema,
  botSettingsSchema,
  pageQuerySchema,
} from '@opchub/shared/api-domains';
import { paginate } from '@opchub/shared/mock-data';
import {
  botActivity,
  listBotThreads,
  mockDb,
  runBotScript,
  stopBotThread,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { botMutationReply, botWriteGuard, parseBotBody, parseBotQuery } from './bot-handler-utils';
import { param, userIdOf } from './domain-util';
import { API } from './util';

export const botRuntimeHandlers = [
  http.post(`${API}/admin/scripts/:id/run`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const id = param(params, 'id');
    return botMutationReply(
      request,
      runBotScript(id, userIdOf(request)),
      'script.run',
      'script',
      id,
      `Xếp lịch kịch bản ${id}`,
      202,
      true,
    );
  }),
  http.get(
    `${API}/admin/bot/threads`,
    ({ request }) =>
      mockAdminGuard(request, 'bots.view') ?? HttpResponse.json({ items: listBotThreads() }),
  ),
  http.post(`${API}/admin/bot/threads/:id/stop`, async ({ request, params }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const id = param(params, 'id');
    return botMutationReply(
      request,
      stopBotThread(id, userIdOf(request)),
      'bot_thread.stop',
      'bot_thread',
      id,
      `Dừng hội thoại ${id}`,
      200,
      true,
    );
  }),
  http.get(
    `${API}/admin/bot/activity`,
    ({ request }) => mockAdminGuard(request, 'bots.view') ?? HttpResponse.json(botActivity()),
  ),
  http.get(`${API}/admin/bot/log`, ({ request }) => {
    const denied = mockAdminGuard(request, 'bots.view');
    if (denied) return denied;
    const q = parseBotQuery(request.url, pageQuerySchema(10));
    return q.ok ? HttpResponse.json(paginate(mockDb().botLog, q.data.page, q.data.size)) : q.res;
  }),
  http.get(
    `${API}/admin/bot/settings`,
    ({ request }) =>
      mockAdminGuard(request, 'bots.view') ?? HttpResponse.json(mockDb().botSettings),
  ),
  http.patch(`${API}/admin/bot/settings`, async ({ request }) => {
    const denied = await botWriteGuard(request);
    if (denied) return denied;
    const parsed = await parseBotBody(request, botSettingsPatchSchema);
    if (!parsed.ok) return parsed.res;
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    );
    mockDb().botSettings = botSettingsSchema.parse({ ...mockDb().botSettings, ...patch });
    return botMutationReply(
      request,
      { ok: true, data: mockDb().botSettings },
      'bot_settings.update',
      'bot_settings',
      'bot',
      'Cập nhật cài đặt bot',
    );
  }),
];
