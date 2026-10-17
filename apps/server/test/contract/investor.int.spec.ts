import { pageSchema } from '@opchub/shared/api';
import {
  adminInvestorSchema,
  adminInvestorSummarySchema,
  csvFileSchema,
  investorCommentSchema,
  investorInterestSchema,
  investorThreadSchema,
  threadMessageSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { z } from 'zod';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });
const FUNDING = {
  amount: 2_000_000_000,
  currency: 'VND' as const,
  equityPercent: 10,
  minTicket: 100_000_000,
};

/**
 * Contract `investor` (11) — schema đúng như apps/portal/src/features/projects/api.ts và
 * apps/admin/src/features/investors/api.ts.
 */
describe('Contract: investor', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  let investor: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
    investor = await tokenOf(t, await createUser(t, { accountType: 'investor' }));
  });
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  it('portal: quan tâm → chủ dự án xem → trao đổi; admin: list → ghi chú → trạng thái → xuất', async () => {
    const p = await createProject(t, owner, { funding: FUNDING });
    const interest = await ep(
      t,
      'POST',
      '/projects/:id/interest',
      `/projects/${p.id}/interest`,
      investorInterestSchema,
      {
        token: investor,
        json: {
          kind: 'fund',
          contactName: 'Nguyễn Hoàng Nam',
          organization: 'Quỹ hợp đồng',
          phone: '+84 903 112 456',
          amount: 500_000_000,
          message: 'Quan tâm vòng Seed',
        },
      },
    );
    const key = interest.data.id;
    await ep(
      t,
      'GET',
      '/projects/:id/interests',
      `/projects/${p.id}/interests`,
      items(investorInterestSchema),
      { token: owner },
    );
    await ep(
      t,
      'POST',
      '/investor-thread/:key/messages',
      `/investor-thread/${key}/messages`,
      threadMessageSchema,
      { token: investor, json: { body: 'Chào anh' } },
    );
    await ep(t, 'GET', '/me/investor-thread', '/me/investor-thread', items(investorThreadSchema), {
      token: investor,
    });

    await ep(
      t,
      'GET',
      '/admin/investors',
      '/admin/investors?page=1&size=10&kind=fund',
      pageSchema(adminInvestorSchema),
      { token: admin },
    );
    await ep(t, 'GET', '/admin/investors/:key', `/admin/investors/${key}`, adminInvestorSchema, {
      token: admin,
    });
    await ep(
      t,
      'POST',
      '/admin/investors/:key/comments',
      `/admin/investors/${key}/comments`,
      investorCommentSchema,
      { token: admin, json: { body: 'Đã gọi điện' } },
    );
    await ep(
      t,
      'GET',
      '/admin/investors/:key/comments',
      `/admin/investors/${key}/comments`,
      items(investorCommentSchema),
      { token: admin },
    );
    await ep(
      t,
      'PATCH',
      '/admin/investors/:key/status',
      `/admin/investors/${key}/status`,
      adminInvestorSchema,
      { token: admin, json: { status: 'connected' } },
    );
    await ep(
      t,
      'GET',
      '/admin/investors/summary',
      '/admin/investors/summary',
      adminInvestorSummarySchema,
      { token: admin },
    );
    await ep(t, 'POST', '/admin/investors/export', '/admin/investors/export', csvFileSchema, {
      token: admin,
      json: { kind: 'fund' },
    });
  });
});
