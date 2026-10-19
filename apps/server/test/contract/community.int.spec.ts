import { pageSchema } from '@opchub/shared/api';
import {
  chatRoomSchema,
  exportJobSchema,
  groupDetailSchema,
  groupItemSchema,
  groupMemberListSchema,
  joinRequestSchema,
  joinResultSchema,
  roomSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { z } from 'zod';
import { addMember, createGroup, removeTestGroups, tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

const items = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });
/** apps/admin/src/features/groups/api.ts — `exportJobSchema.extend({ rows })` */
const exportResultSchema = exportJobSchema.extend({ rows: z.number().int() });
const idResultSchema = z.object({ id: z.string() });
/** Nhóm seed dùng tạm cho POST/PATCH/DELETE admin (34 tỉnh đều có nhóm; c34 do spec B20 dùng) */
const SEED_GROUP = 'c33';

/**
 * Contract `community` (17) — schema đúng như apps/portal/src/features/{community,chat}/api.ts
 * và apps/admin/src/features/groups/api.ts.
 */
describe('Contract: community', () => {
  let t: TestApp;
  let admin: string;
  let owner: string;
  let applicant: { id: string; token: string };
  let group: { id: string };
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const o = await createUser(t, { fee: 'active' });
    owner = await tokenOf(t, o);
    const a = await createUser(t, { fee: 'active' });
    applicant = { id: a.id, token: await tokenOf(t, a) };
    group = await createGroup(t, { joinMode: 'approval' });
    await addMember(t, group.id, o.id, 'owner');
  });
  afterAll(async () => {
    await removeTestGroups(t);
    await t.close();
  });

  it('portal: list → xin vào → chủ nhóm duyệt → phòng/chủ đề → rời nhóm', async () => {
    const id = group.id;
    await ep(t, 'GET', '/groups', '/groups?page=1&size=100', pageSchema(groupItemSchema), {
      token: applicant.token,
    });
    await ep(t, 'POST', '/groups/:id/join', `/groups/${id}/join`, joinResultSchema, {
      token: applicant.token,
      json: { intro: 'Xin vào nhóm hợp đồng', agreeRules: true },
    });
    await ep(t, 'GET', '/groups/:id/requests', `/groups/${id}/requests`, items(joinRequestSchema), {
      token: owner,
    });
    await ep(
      t,
      'GET',
      '/admin/groups/requests',
      '/admin/groups/requests',
      items(joinRequestSchema),
      { token: admin },
    );
    await ep(
      t,
      'POST',
      '/groups/:id/requests/:userId/:decision',
      `/groups/${id}/requests/${applicant.id}/approve`,
      joinResultSchema,
      { token: owner },
    );
    await ep(t, 'GET', '/groups/:id/rooms', `/groups/${id}/rooms`, items(chatRoomSchema), {
      token: applicant.token,
    });
    await ep(t, 'GET', '/groups/:id/rooms', `/groups/${id}/rooms`, items(roomSchema), {
      token: admin,
    });
    await ep(t, 'POST', '/groups/:id/rooms', `/groups/${id}/rooms`, chatRoomSchema, {
      token: applicant.token,
      json: { name: `Chủ đề ${randomUUID().slice(0, 6)}` },
    });
    await ep(t, 'DELETE', '/groups/:id/join', `/groups/${id}/join`, joinResultSchema, {
      token: applicant.token,
    });
  });

  it('admin: list, chi tiết, số thành viên, danh sách + xuất', async () => {
    const id = group.id;
    await ep(
      t,
      'GET',
      '/admin/groups',
      '/admin/groups?page=1&size=100',
      pageSchema(groupItemSchema),
      { token: admin },
    );
    await ep(t, 'GET', '/admin/groups/:id', `/admin/groups/${id}`, groupDetailSchema, {
      token: admin,
    });
    await ep(
      t,
      'GET',
      '/admin/groups/member-counts',
      '/admin/groups/member-counts',
      z.record(z.string(), z.number().int()),
      { token: admin },
    );
    await ep(
      t,
      'GET',
      '/admin/groups/members',
      `/admin/groups/members?groupIds=${id}&status=all`,
      groupMemberListSchema,
      { token: admin },
    );
    await ep(
      t,
      'POST',
      '/admin/groups/members/export',
      '/admin/groups/members/export',
      exportResultSchema,
      {
        token: admin,
        json: { groupIds: [id], fields: ['name', 'email'], status: 'all', format: 'csv' },
      },
      202,
    );
    await ep(
      t,
      'POST',
      '/admin/groups/:id/members/export',
      `/admin/groups/${id}/members/export`,
      exportResultSchema,
      { token: admin },
      202,
    );
  });

  it('admin: tạo → sửa → xoá nhóm (tỉnh thật — xoá mềm nhóm seed rồi khôi phục)', async () => {
    const seed = await t.prisma.db.group.findUniqueOrThrow({
      where: { id: SEED_GROUP },
      select: { province: true },
    });
    await t.prisma.db.group.update({ where: { id: SEED_GROUP }, data: { deletedAt: new Date() } });
    let createdId: string | null = null;
    try {
      const body = {
        name: `OPC hợp đồng ${randomUUID().slice(0, 6)}`,
        province: seed.province,
        description: 'Nhóm tạo bởi contract test',
        joinMode: 'open' as const,
      };
      const created = await ep(t, 'POST', '/admin/groups', '/admin/groups', groupDetailSchema, {
        token: admin,
        json: body,
      });
      createdId = created.data.id;
      await ep(t, 'PATCH', '/admin/groups/:id', `/admin/groups/${createdId}`, groupDetailSchema, {
        token: admin,
        json: { ...body, name: `${body.name} sửa` },
      });
      await ep(t, 'DELETE', '/admin/groups/:id', `/admin/groups/${createdId}`, idResultSchema, {
        token: admin,
      });
    } finally {
      if (createdId) await t.prisma.db.group.delete({ where: { id: createdId } });
      await t.prisma.db.group.update({ where: { id: SEED_GROUP }, data: { deletedAt: null } });
    }
  });
});
