import { botHideMessagesSchema } from '@opchub/shared/api-domains';
import { emergencyStopMockBot, hideMockBotMessages } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { reply, userIdOf, validationError } from './domain-util';
import { API } from './util';

export const botEmergencyHandlers = [
  http.post(`${API}/admin/bot/emergency-stop`, ({ request }) => {
    const denied = mockAdminGuard(request, 'bots.action');
    return denied ?? reply(emergencyStopMockBot(userIdOf(request)));
  }),
  http.post(`${API}/admin/bot/hide-messages`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'bots.action');
    if (denied) return denied;
    // Never coerce malformed JSON/null into {}, which would mean a global hide.
    const raw: unknown = await request.json().catch(() => undefined);
    const parsed = botHideMessagesSchema.safeParse(raw);
    return parsed.success
      ? reply(hideMockBotMessages(userIdOf(request), parsed.data))
      : validationError(parsed.error);
  }),
];
