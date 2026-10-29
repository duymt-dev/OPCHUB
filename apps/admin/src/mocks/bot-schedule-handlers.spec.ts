import { botScheduleResponseSchema } from '@opchub/shared/api-domains';
import { apiErrorSchema } from '@opchub/shared/api';
import { auditLog, botState, mockBotSchedule } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { botContractFixture, botRequest } from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(botContractFixture);
afterAll(() => server.close());
const path = '/admin/bot/schedule';
it('reads defaults and records successful schedule writes in both mock audit stores', async () => {
  const response = await botRequest(path);
  expect(response.status).toBe(200);
  expect(botScheduleResponseSchema.parse(await response.json()).state).toBe('live');
  expect((await botRequest(path, 'PATCH', { paused: true })).status).toBe(200);
  expect(mockBotSchedule().state).toBe('paused');
  expect(botState().audit.filter((row) => row.action === 'bot.schedule.update')).toHaveLength(1);
  expect(auditLog().filter((row) => row.action === 'bot.schedule.update')).toHaveLength(1);
});
it.each([
  { paused: 'true' },
  { fromDate: '2026-02-30' },
  { fromDate: '2026-10-22', toDate: '2026-10-21' },
  { unknown: true },
])('rejects malformed input %j with field errors and no state/audit writes', async (body) => {
  const response = await botRequest(path, 'PATCH', body);
  expect(response.status).toBe(400);
  const error = apiErrorSchema.parse(await response.json()).error;
  expect(error.code).toBe('VALIDATION_ERROR');
  expect(error.fields?.length).toBeGreaterThan(0);
  expect(mockBotSchedule().state).toBe('live');
  expect(botState().audit).toHaveLength(0);
  expect(auditLog()).toHaveLength(0);
});
it('enforces401/403/413 and preserves pause when clearing the schedule', async () => {
  expect((await botRequest(path, 'GET', undefined, '')).status).toBe(401);
  expect((await botRequest(path, 'PATCH', { paused: true }, '')).status).toBe(401);
  expect((await botRequest(path, 'PATCH', { paused: true }, 'adm-hang')).status).toBe(403);
  expect((await botRequest(path, 'PATCH', { fromDate: 'x'.repeat(2_000_000) })).status).toBe(413);
  expect((await botRequest(path, 'PATCH', { paused: true, fromDate: '2026-10-21' })).status).toBe(
    200,
  );
  expect((await botRequest(path, 'PATCH', { fromDate: null, toDate: null })).status).toBe(200);
  expect(mockBotSchedule().schedule).toEqual({ fromDate: null, toDate: null, paused: true });
});
