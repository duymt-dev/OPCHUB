import type { FakeBankProvider } from '@opchub/integrations';
import { FUNDRAISING_PLAN } from '@opchub/shared';
import {
  fundraisingConfirmSchema,
  fundraisingPaymentSchema,
  myFundraisingsSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { BANK } from '@/common/integrations';
import { ReconcileService } from '@/modules/membership-fee';
import { tokenOf } from '../factories/group.factory';
import { createProject, removeTestProjects } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/**
 * Contract Gói Gọi vốn (V4-610, 4) — schema đúng như apps/portal/src/features/projects/api.ts và
 * apps/admin/src/features/projects/api.ts.
 */
describe('Contract: project · Gói Gọi vốn', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  afterAll(async () => {
    await removeTestProjects(t);
    await t.close();
  });

  it('mua → xác nhận chuyển khoản → đối soát → Admin duyệt', async () => {
    const p = await createProject(t, owner, {
      funding: { amount: 1_000_000_000, currency: 'VND', equityPercent: 5 },
    });
    const f = await ep(
      t,
      'POST',
      '/projects/:id/fundraising',
      `/projects/${p.id}/fundraising`,
      fundraisingPaymentSchema,
      { token: owner },
    );
    await ep(t, 'GET', '/me/fundraisings', '/me/fundraisings', myFundraisingsSchema, {
      token: owner,
    });
    await ep(
      t,
      'POST',
      '/me/fundraisings/:id/transfer-confirm',
      `/me/fundraisings/${f.data.id}/transfer-confirm`,
      fundraisingConfirmSchema,
      { token: owner },
      202,
    );
    const bank = t.app.get<FakeBankProvider>(BANK);
    const signed = bank.sign({
      id: `c-${f.data.id}`,
      amount: FUNDRAISING_PLAN.amount,
      content: f.data.transferContent,
    });
    await t.call('/webhooks/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: signed.rawBody,
    });
    const txn = await t.prisma.db.paymentTransaction.findFirstOrThrow({
      where: { content: f.data.transferContent },
    });
    await t.app.get(ReconcileService).match(txn.id);
    await ep(
      t,
      'POST',
      '/admin/projects/:id/fundraising/:fid/review',
      `/admin/projects/${p.id}/fundraising/${f.data.id}/review`,
      null,
      { token: admin, json: { decision: 'approve' } },
      204,
    );
  });
});
