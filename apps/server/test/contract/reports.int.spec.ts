import {
  reportExportResponseSchema,
  reportPreviewSchema,
  reportScopesSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';
import { createContractGroup } from './lane-b.helpers';

/** Contract `reporting` Báo cáo B1/B2/B3 (3; V4-614) — schema đúng như apps/admin/src/features/reports/api.ts */
describe('Contract: reports (V4-614)', () => {
  let t: TestApp;
  let admin: string;
  let adminId: string;
  const groupIds: string[] = [];
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const a = await createUser(t, { systemRole: 'admin' });
    adminId = a.id;
    admin = await tokenOf(t, a);
  });
  afterAll(async () => {
    await t.prisma.db.exportJob.deleteMany({ where: { requestedBy: adminId } });
    await t.prisma.db.group.deleteMany({ where: { id: { in: groupIds } } });
    await t.close();
  });

  it('phạm vi → xem trước → xuất (202)', async () => {
    const g = await createContractGroup(t);
    groupIds.push(g.id);
    const scopes = await ep(
      t,
      'GET',
      '/admin/reports/scopes',
      '/admin/reports/scopes',
      reportScopesSchema,
      { token: admin },
    );
    expect(scopes.data.groups.some((x) => x.id === g.id)).toBe(true);
    const q = new URLSearchParams({ template: 'b1', month: '2001-03', groupId: g.id });
    const p = await ep(
      t,
      'GET',
      '/admin/reports/preview',
      `/admin/reports/preview?${q.toString()}`,
      reportPreviewSchema,
      { token: admin },
    );
    expect(p.data.template).toBe('b1');
    const job = await ep(
      t,
      'POST',
      '/admin/reports/export',
      '/admin/reports/export',
      reportExportResponseSchema,
      { token: admin, json: { template: 'b1', month: '2001-03', groupId: g.id } },
      202,
    );
    expect(job.data.status).toBe('queued');
  });
});
