import { setupServer } from 'msw/node';
import { auditLog, botState } from '@opchub/shared/mock-domains';
import { handlers } from './handlers';
import {
  BOT_READS,
  BOT_WRITES,
  botContractFixture,
  botRequest,
  botSnapshot,
} from './tests/bot-contract.fixture';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  botContractFixture();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('P5-MSW-04 REQ-208 D-50 Admin bot permission boundaries', () => {
  it.each(BOT_READS)(
    'read %s rejects unauthenticated/member/no-key actors before worker side effects',
    async (path) => {
      const before = botSnapshot();
      for (const [actor, status] of [
        ['', 401],
        ['m1', 401],
        ['adm-mai', 403],
      ] as const) {
        expect((await botRequest(path, 'GET', undefined, actor)).status).toBe(status);
        expect(botSnapshot()).toEqual(before);
      }
    },
  );

  it.each(BOT_WRITES)(
    '%s %s requires bots.action before parsing/mutation/audit',
    async (method, path) => {
      const before = botSnapshot();
      for (const [actor, status] of [
        ['', 401],
        ['m1', 401],
        ['adm-mai', 403],
        ['adm-hang', 403],
      ] as const) {
        expect((await botRequest(path, method, {}, actor)).status).toBe(status);
        expect(botSnapshot()).toEqual(before);
      }
    },
  );

  it('invalid authenticated create returns400 without a pre-validation phantom audit', async () => {
    expect((await botRequest('/admin/personas', 'POST', {})).status).toBe(400);
    expect(botState().audit).toEqual([]);
    expect(auditLog()).toEqual([]);
  });

  it('a successful create audits the actual actor and newly persisted ID in both logs', async () => {
    const response = await botRequest('/admin/personas', 'POST', {
      name: 'Actual persona',
      title: 'Founder',
      province: '',
      tone: '',
      groupIds: ['c1'],
    });
    expect(response.status).toBe(201);
    const row = (await response.json()) as { id: string };
    expect(botState().audit[0]).toMatchObject({
      action: 'persona.create',
      entityId: row.id,
      actorId: 'admin',
    });
    expect(auditLog().filter((a) => a.action === 'persona.create')).toHaveLength(1);
    expect(auditLog()[0]).toMatchObject({
      action: 'persona.create',
      actorId: 'admin',
      target: row.id,
    });
  });
});
