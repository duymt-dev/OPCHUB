import { botSettingsSchema } from '@opchub/shared/api-domains';
import { mockDb, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetMockDb();
  mockDb().botSettings.autoGenerate = false;
  mockDb().botSettings.replyToMembers = false;
});
afterAll(() => server.close());

it.each([{ enabled: true }, { topics: ['New topic'] }, { delayMinutes: 2 }])(
  'REQ-208 MSW PATCH %j preserves both omitted false toggles',
  async (patch) => {
    const before = structuredClone(mockDb().botSettings);
    const response = await fetch(`${location.origin}/v1/admin/bot/settings`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer mock.admin', 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    expect(response.status).toBe(200);
    expect(botSettingsSchema.parse(await response.json())).toEqual({ ...before, ...patch });
    expect(mockDb().botSettings).toEqual({ ...before, ...patch });
  },
);
