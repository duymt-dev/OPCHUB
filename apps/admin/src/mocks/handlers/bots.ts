import {
  stopBotThread,
  auditBot,
  botActivity,
  listBotThreads,
  mockDb,
  runBotScript,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { param, reply } from './domain-util';
import { API } from './util';
import { botEmergencyHandlers } from './bot-emergency';

/** D-50: scheduled/running/done execution; run queues, stop retains terminal history.
 * Every turn posts automatically without the retired approve/discard workflow.
 */

const exists = (list: { id: string }[], id: string) => list.some((x) => x.id === id);

export const botHandlers = [
  ...botEmergencyHandlers,
  http.post(`${API}/admin/scripts/:id/run`, ({ params }) =>
    reply(runBotScript(param(params, 'id')), 202),
  ),
  http.get(`${API}/admin/bot/threads`, () => HttpResponse.json({ items: listBotThreads() })),
  http.post(`${API}/admin/bot/threads/:id/stop`, ({ params }) =>
    reply(stopBotThread(param(params, 'id'))),
  ),
  http.get(`${API}/admin/bot/activity`, () => HttpResponse.json(botActivity())),

  // Audit rồi chuyển tiếp cho crudRoutes của admin-system
  http.post(`${API}/admin/personas`, () => {
    auditBot('persona.create', 'persona', 'new');
  }),
  http.patch(`${API}/admin/personas/:id`, ({ params }) => {
    const id = param(params, 'id');
    if (exists(mockDb().personas, id)) auditBot('persona.update', 'persona', id);
  }),
  http.delete(`${API}/admin/personas/:id`, ({ params }) => {
    const id = param(params, 'id');
    if (exists(mockDb().personas, id)) auditBot('persona.delete', 'persona', id);
  }),
  http.post(`${API}/admin/scripts`, () => {
    auditBot('script.create', 'script', 'new');
  }),
  http.patch(`${API}/admin/scripts/:id`, ({ params }) => {
    const id = param(params, 'id');
    if (exists(mockDb().scripts, id)) auditBot('script.update', 'script', id);
  }),
  http.delete(`${API}/admin/scripts/:id`, ({ params }) => {
    const id = param(params, 'id');
    if (exists(mockDb().scripts, id)) auditBot('script.delete', 'script', id);
  }),
  http.patch(`${API}/admin/bot/settings`, () => {
    auditBot('bot_settings.update', 'bot_settings', 'bot');
  }),
];
