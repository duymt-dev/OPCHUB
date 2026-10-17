import {
  adminMemberPageSchema,
  adminMemberSchema,
  adminOverviewSchema,
  assignGroupsResponseSchema,
  auditLogRowSchema,
  bulkStatusResultSchema,
  exportJobSchema,
  exportStatusSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/** Như apps/admin/src/features/settings/api.ts */
const items = <T extends z.ZodType>(s: T) => z.object({ items: z.array(s) });

/**
 * Contract `account` Admin (7) + `audit` (1) + `export` (1) + `reporting` `/admin/overview` —
 * schema đúng như apps/admin/src/features/{members,settings,overview}/…; `/admin/exports/:id`
 * FE chưa gọi → schema server trả (`exportStatusSchema`).
 */
describe('Contract: account (admin), audit, export, overview', () => {
  let t: TestApp;
  let adminId: string;
  let admin: string;
  let superAdmin: string;
  let groupId: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const a = await createUser(t, { systemRole: 'admin' });
    adminId = a.id;
    admin = await tokenOf(t, a);
    superAdmin = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    groupId = (await createGroup(t)).id;
  });
  afterAll(async () => {
    await t.prisma.db.exportJob.deleteMany({ where: { requestedBy: adminId } });
    await removeTestGroups(t);
    await t.close();
  });

  it('thành viên: danh sách → khoá/mở → vai trò → xác minh DN → gán nhóm', async () => {
    const target = await createUser(t, { systemRole: 'moderator' });
    const biz = await createUser(t, { accountType: 'business' });
    await t.prisma.db.businessProfile.create({
      data: {
        userId: biz.id,
        taxCode: '0109999000',
        companyName: 'Công ty Hợp Đồng',
        representative: 'Nguyễn Văn An',
        position: 'Giám đốc',
        mainField: 'Phần mềm',
        subFields: [],
        verification: 'pending',
      },
    });

    const page = await ep(
      t,
      'GET',
      '/admin/users',
      '/admin/users?page=1&size=20&type=business',
      adminMemberPageSchema,
      { token: admin },
    );
    expect(page.data.counts.all).toBeGreaterThan(0);

    await ep(
      t,
      'PATCH',
      '/admin/users/:id/status',
      `/admin/users/${target.id}/status`,
      z.object({ id: z.string(), status: z.string() }),
      { token: admin, json: { status: 'locked' } },
    );
    const bulk = await ep(
      t,
      'POST',
      '/admin/users/status',
      '/admin/users/status',
      bulkStatusResultSchema,
      { token: admin, json: { userIds: [target.id], status: 'active' } },
    );
    expect(bulk.data.updated).toBe(1);

    const role = await ep(
      t,
      'PATCH',
      '/admin/users/:id/role',
      `/admin/users/${target.id}/role`,
      adminMemberSchema,
      { token: superAdmin, json: { role: 'admin' } },
    );
    expect(role.data.systemRole).toBe('admin');

    const verified = await ep(
      t,
      'POST',
      '/admin/users/:id/verification',
      `/admin/users/${biz.id}/verification`,
      adminMemberSchema,
      { token: admin, json: { decision: 'approve' } },
    );
    expect(verified.data.business?.verification).toBe('verified');

    const assigned = await ep(
      t,
      'POST',
      '/admin/users/assign-groups',
      '/admin/users/assign-groups',
      assignGroupsResponseSchema,
      { token: admin, json: { userIds: [biz.id], groupIds: [groupId], role: 'member' } },
    );
    expect(assigned.data.updated).toBe(1);
  });

  it('xuất danh sách → trạng thái job; audit log; tổng quan', async () => {
    const u = await createUser(t);
    const job = await ep(
      t,
      'POST',
      '/admin/users/export',
      '/admin/users/export',
      exportJobSchema,
      { token: admin, json: { userIds: [u.id] } },
      202,
    );
    const st = await ep(
      t,
      'GET',
      '/admin/exports/:id',
      `/admin/exports/${job.data.jobId}`,
      exportStatusSchema,
      { token: admin },
    );
    expect(st.data.status).toBe('queued');

    const logs = await ep(
      t,
      'GET',
      '/admin/audit-logs',
      '/admin/audit-logs',
      items(auditLogRowSchema),
      { token: admin },
    );
    expect(logs.data.items.length).toBeGreaterThan(0);

    await ep(t, 'GET', '/admin/overview', '/admin/overview', adminOverviewSchema, {
      token: admin,
    });
  });
});
